const STORAGE_KEY = 'my-work-schedule-v1';

const DEFAULT_STATE = {
  settings: {
    regularMinutes: 540,
    fridayMinutes: 465,
    earliest: '07:00',
    latest: '21:00',
    periodStartDay: 20,
    defaultCommute: 50,
    defaultPlannedArrival: '07:30'
  },
  entries: {},
  weekPlans: {},
  planTemplates: [],
  planCompletions: {}
};

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const PLAN_DAYS = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' }
];

const QUOTES = {
  0: ['Воскресенье — официальный день ничего не трогать', 'Сегодня можно не торопиться. Совсем'],
  1: ['Понедельник — день бездельник. Но часы сами себя не накопят', 'Главное в понедельник — красиво начать неделю'],
  2: ['Вторник уже не понедельник. Это победа', 'Работаем умно, чтобы потом уйти на пары вовремя'],
  3: ['Среда — маленькая пятница, если очень верить', 'Половина недели позади. Баланс часов всё помнит'],
  4: ['Четверг — почти пятница, держимся', 'Ещё чуть-чуть, и можно планировать ранний уход'],
  5: ['Пятница создана, чтобы уходить раньше', '7 часов 45 минут — звучит уже по-человечески'],
  6: ['Суббота. Рабочий баланс сегодня отдыхает', 'Никаких долгов по часам. Только отдых']
};

let state = loadState();
let shownPeriodStart = getPeriodStart(new Date());
let shownPlanWeekStart = weekStart(new Date());
let shownCalendarMonth = monthStart(new Date());
let toastTimer = null;

const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    return {
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
      entries: saved.entries || {},
      weekPlans: saved.weekPlans || {},
      planTemplates: saved.planTemplates || [],
      planCompletions: saved.planCompletions || {}
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pad(n) { return String(n).padStart(2, '0'); }

function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function dateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0, 0);
}

function minutesFromTime(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timeFromMinutes(total) {
  if (total == null || Number.isNaN(total)) return '—';
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

function formatDuration(minutes) {
  const value = Math.abs(Math.round(minutes));
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

function formatSigned(minutes) {
  const rounded = Math.round(minutes || 0);
  if (rounded === 0) return '0 мин';
  return `${rounded > 0 ? '+' : '−'}${formatDuration(rounded)}`;
}

function durationText(minutes) {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

function parseDuration(value) {
  const match = String(value).trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2] || 0);
  if (mins > 59) return null;
  return hours * 60 + mins;
}

function requiredMinutesForDate(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return 0;
  if (day === 5) return state.settings.fridayMinutes;
  return state.settings.regularMinutes;
}

function requiredLeave(date, arrival) {
  const start = minutesFromTime(arrival);
  if (start == null) return null;
  const required = requiredMinutesForDate(date);
  if (!required) return null;
  return start + required;
}

function plannedLeave(plan) {
  const must = minutesFromTime(plan?.mustBeAt);
  if (must == null) return null;
  const commute = Number.isFinite(Number(plan?.commuteMinutes)) ? Number(plan.commuteMinutes) : state.settings.defaultCommute;
  return must - commute;
}

function getEffectivePlan(key, entry = state.entries[key] || {}) {
  const weekly = state.weekPlans[key] || {};
  const entryHasEvent = Boolean(entry.mustBeAt);
  return {
    plannedArrival: weekly.plannedArrival || '',
    mustBeAt: entry.mustBeAt || weekly.mustBeAt || '',
    commuteMinutes: entryHasEvent
      ? (entry.commuteMinutes ?? state.settings.defaultCommute)
      : (weekly.commuteMinutes ?? state.settings.defaultCommute),
    destination: entry.destination || weekly.destination || ''
  };
}

function planDelta(date, plan) {
  const normal = requiredLeave(date, plan?.plannedArrival);
  const leave = plannedLeave(plan);
  if (normal == null || leave == null) return null;
  return leave - normal;
}

function entryDelta(date, entry) {
  if (!entry?.arrival || !entry?.actualLeave) return null;
  const req = requiredLeave(date, entry.arrival);
  const actual = minutesFromTime(entry.actualLeave);
  if (req == null || actual == null) return null;
  return actual - req;
}

function getPeriodStart(date) {
  const d = dateOnly(date);
  const startDay = state.settings.periodStartDay;
  if (d.getDate() >= startDay) return new Date(d.getFullYear(), d.getMonth(), startDay, 12);
  return new Date(d.getFullYear(), d.getMonth() - 1, startDay, 12);
}

function getPeriodEnd(start) {
  return addDays(new Date(start.getFullYear(), start.getMonth() + 1, state.settings.periodStartDay, 12), -1);
}

function shiftPeriod(start, offset) {
  return new Date(start.getFullYear(), start.getMonth() + offset, state.settings.periodStartDay, 12);
}

function datesBetween(start, end) {
  const result = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) result.push(new Date(d));
  return result;
}

function periodBalance(start, excludeIso = null) {
  const end = getPeriodEnd(start);
  return datesBetween(start, end).reduce((sum, date) => {
    const key = isoDate(date);
    if (key === excludeIso) return sum;
    const delta = entryDelta(date, state.entries[key]);
    return sum + (delta ?? 0);
  }, 0);
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
}

function formatPeriod(start) {
  const end = getPeriodEnd(start);
  return `${formatDateLong(start)} — ${formatDateLong(end)}`;
}

function formatMonth(date) {
  const text = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function weekStart(date = new Date()) {
  const d = dateOnly(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
}

function showToast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function setBalanceStyle(element, value) {
  element.classList.remove('positive-text', 'negative-text');
  if (value > 0) element.classList.add('positive-text');
  if (value < 0) element.classList.add('negative-text');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderHeader() {
  const now = new Date();
  $('todayDate').textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
}

function renderHome() {
  const now = new Date();
  const today = dateOnly(now);
  const key = isoDate(today);
  const entry = state.entries[key] || {};
  const plan = getEffectivePlan(key, entry);
  const day = today.getDay();
  const currentPeriod = getPeriodStart(today);
  const balance = periodBalance(currentPeriod);

  $('homeWeekday').textContent = WEEKDAYS[day];
  const quotes = QUOTES[day];
  $('homeQuote').textContent = quotes[today.getDate() % quotes.length];
  $('clockNow').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  $('periodBalance').textContent = formatSigned(balance);
  setBalanceStyle($('periodBalance'), balance);
  $('periodRange').textContent = formatPeriod(currentPeriod);

  const arrivalForCalc = entry.arrival || plan.plannedArrival;
  const req = requiredLeave(today, arrivalForCalc);
  $('requiredToday').textContent = req == null
    ? (requiredMinutesForDate(today) ? durationText(requiredMinutesForDate(today)) : 'Выходной')
    : timeFromMinutes(req);
  if (req == null) {
    $('requiredHint').textContent = requiredMinutesForDate(today) ? 'Длительность рабочего дня' : 'По графику отдых';
  } else {
    $('requiredHint').textContent = entry.arrival ? `при приходе в ${entry.arrival}` : `если прийти в ${plan.plannedArrival}`;
  }

  $('todayStatusTitle').textContent = requiredMinutesForDate(today) ? (day === 5 ? 'Короткая пятница' : 'Рабочий день') : 'Выходной';
  $('todayArrival').textContent = entry.arrival || '—';
  $('todayRequiredLeave').textContent = req == null ? '—' : timeFromMinutes(req);
  $('todayActualLeave').textContent = entry.actualLeave || '—';

  const pLeave = plannedLeave(plan);
  if (plan.mustBeAt && pLeave != null) {
    $('studyPreviewTitle').textContent = plan.destination || `Нужно быть к ${plan.mustBeAt}`;
    const arrivalText = plan.plannedArrival && !entry.arrival ? `Плановый приход ${plan.plannedArrival} · ` : '';
    $('studyPreviewText').textContent = `${arrivalText}быть к ${plan.mustBeAt} · дорога ${plan.commuteMinutes} мин · уйти с работы не позже ${timeFromMinutes(pLeave)}`;
  } else if (plan.plannedArrival && !entry.arrival) {
    $('studyPreviewTitle').textContent = `Плановый приход — ${plan.plannedArrival}`;
    $('studyPreviewText').textContent = req == null ? 'План сохранён' : `Если прийти вовремя, по норме можно уходить в ${timeFromMinutes(req)}`;
  } else {
    $('studyPreviewTitle').textContent = 'Планов пока нет';
    $('studyPreviewText').textContent = 'Добавь план недели — приложение само посчитает, во сколько уходить на учёбу';
  }

  const smart = $('smartTip');
  smart.hidden = true;
  if (arrivalForCalc && !entry.actualLeave && requiredMinutesForDate(today)) {
    const balanceBeforeToday = periodBalance(currentPeriod, key);
    const normal = requiredLeave(today, arrivalForCalc);
    const zeroBalanceLeave = normal - balanceBeforeToday;
    let text;

    if (entry.arrival) {
      text = balanceBeforeToday === 0
        ? `Чтобы закончить день без долга, уходи в ${timeFromMinutes(normal)}`
        : balanceBeforeToday > 0
          ? `Накоплено ${formatDuration(balanceBeforeToday)}. Для общего баланса 0 сегодня можно уйти в ${timeFromMinutes(zeroBalanceLeave)}`
          : `Долг ${formatDuration(balanceBeforeToday)}. Чтобы закрыть его сегодня, нужно уйти в ${timeFromMinutes(zeroBalanceLeave)}`;
    } else {
      text = `Если придёшь в ${arrivalForCalc}, по норме уход в ${timeFromMinutes(normal)}`;
      if (balanceBeforeToday > 0) text += ` · с текущим запасом можно до ${timeFromMinutes(zeroBalanceLeave)}`;
      if (balanceBeforeToday < 0) text += ` · для закрытия долга нужно доработать до ${timeFromMinutes(zeroBalanceLeave)}`;
    }

    if (pLeave != null) {
      const dayChange = pLeave - normal;
      text += ` · чтобы успеть${plan.destination ? ` на ${plan.destination}` : ''}, уйти до ${timeFromMinutes(pLeave)}`;
      if (dayChange !== 0) text += ` (${formatSigned(dayChange)} за день)`;
    }

    smart.textContent = text;
    smart.hidden = false;
  }
}

function renderCalendar() {
  $('calendarTitle').textContent = formatMonth(shownCalendarMonth);
  const grid = $('calendarGrid');
  grid.innerHTML = '';

  const year = shownCalendarMonth.getFullYear();
  const month = shownCalendarMonth.getMonth();
  const first = new Date(year, month, 1, 12);
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
  const offset = (first.getDay() + 6) % 7;
  const todayKey = isoDate(new Date());

  for (let i = 0; i < offset; i += 1) {
    const blank = document.createElement('span');
    blank.className = 'calendar-day blank';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12);
    const key = isoDate(date);
    const entry = state.entries[key] || {};
    const weeklyPlan = state.weekPlans[key] || {};
    const plan = getEffectivePlan(key, entry);
    const delta = entryDelta(date, entry);
    const hasStudyPlan = Boolean(plan.mustBeAt || weeklyPlan.plannedArrival);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    if (date.getDay() === 0 || date.getDay() === 6) button.classList.add('weekend');
    if (key === todayKey) button.classList.add('today');
    if (delta != null) button.classList.add(delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral');
    if (entry.arrival && !entry.actualLeave) button.classList.add('partial');
    if (hasStudyPlan) button.classList.add('has-plan');
    button.setAttribute('aria-label', `${formatDateLong(date)}${delta == null ? '' : `, ${formatSigned(delta)}`}`);
    button.innerHTML = `<span class="calendar-number">${day}</span>${hasStudyPlan ? '<i class="study-marker"></i>' : ''}`;
    button.addEventListener('click', () => openCalendarDay(key));
    grid.appendChild(button);
  }
}

function renderSchedule() {
  const currentStart = getPeriodStart(new Date());
  const end = getPeriodEnd(shownPeriodStart);
  const isCurrent = isoDate(shownPeriodStart) === isoDate(currentStart);
  const balance = periodBalance(shownPeriodStart);

  $('periodToolbarTitle').textContent = isCurrent ? 'Текущий период' : 'Прошедший период';
  $('periodToolbarSubtitle').textContent = formatPeriod(shownPeriodStart);
  $('scheduleBalance').textContent = formatSigned(balance);
  setBalanceStyle($('scheduleBalance'), balance);
  $('nextPeriodBtn').disabled = isCurrent;
  $('nextPeriodBtn').style.opacity = isCurrent ? '.28' : '1';

  renderCalendar();

  const list = $('scheduleList');
  list.innerHTML = '';
  const today = dateOnly(new Date());
  const todayKey = isoDate(today);

  for (const date of datesBetween(shownPeriodStart, end)) {
    const key = isoDate(date);
    const entry = state.entries[key] || null;
    const weeklyPlan = state.weekPlans[key] || null;
    const plan = getEffectivePlan(key, entry || {});
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (weekend && !entry && !weeklyPlan) continue;

    const delta = entryDelta(date, entry);
    const arrivalForCalc = entry?.arrival || plan.plannedArrival;
    const req = requiredLeave(date, arrivalForCalc);
    const pLeave = plannedLeave(plan);
    const hasAnyData = Boolean(entry || weeklyPlan);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `day-card${weekend ? ' weekend' : ''}${key === todayKey ? ' today' : ''}`;
    card.style.textAlign = 'left';
    card.style.width = '100%';
    card.style.color = 'inherit';
    card.style.cursor = 'pointer';

    const deltaClass = delta == null ? '' : delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    const arrivalText = entry?.arrival || plan.plannedArrival || '—';
    const arrivalLabel = entry?.arrival ? 'Приход' : plan.plannedArrival ? 'Приход · план' : 'Приход';
    const planText = plan.mustBeAt
      ? `${escapeHtml(plan.destination || 'После работы')} · быть к ${plan.mustBeAt}${pLeave != null ? ` · уйти до ${timeFromMinutes(pLeave)}` : ''}`
      : weeklyPlan?.plannedArrival
        ? `Плановый приход ${weeklyPlan.plannedArrival}${req != null ? ` · по норме до ${timeFromMinutes(req)}` : ''}`
        : '';

    card.innerHTML = `
      <div class="day-card-head">
        <div class="day-date"><strong>${formatDateShort(date)}</strong><span>${WEEKDAYS_SHORT[date.getDay()]}</span></div>
        <span class="delta ${deltaClass}">${delta == null ? '—' : formatSigned(delta)}</span>
      </div>
      ${hasAnyData ? `
        <div class="day-times">
          <div><span>${arrivalLabel}</span><strong>${arrivalText}</strong></div>
          <div><span>Норма</span><strong>${req == null ? '—' : timeFromMinutes(req)}</strong></div>
          <div><span>План</span><strong>${pLeave == null ? '—' : timeFromMinutes(pLeave)}</strong></div>
          <div><span>Уход</span><strong>${entry?.actualLeave || '—'}</strong></div>
        </div>
        ${planText ? `<div class="day-plan">${planText}</div>` : ''}
      ` : `<div class="empty-day">Нажми, чтобы заполнить день</div>`}
    `;

    card.addEventListener('click', () => {
      if (date > today && weeklyPlan) openWeekPlanDialog(key);
      else openEntryDialog(key);
    });
    list.appendChild(card);
  }
}

function renderWeekPlanner() {
  const root = $('weekPlannerList');
  root.innerHTML = '';
  const today = dateOnly(new Date());

  for (let offset = 0; offset < 5; offset += 1) {
    const date = addDays(shownPlanWeekStart, offset);
    const key = isoDate(date);
    const plan = state.weekPlans[key] || {};
    const entry = state.entries[key] || {};
    const hasPlan = Boolean(plan.plannedArrival || plan.mustBeAt || plan.destination);
    const normal = requiredLeave(date, plan.plannedArrival);
    const needLeave = plannedLeave(plan);
    const delta = planDelta(date, plan);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = `week-plan-row${key === isoDate(today) ? ' today' : ''}${hasPlan ? ' filled' : ''}`;

    let mainText = 'Добавить план';
    let subText = `Плановый приход по умолчанию ${state.settings.defaultPlannedArrival}`;
    let badge = '＋';
    let badgeClass = '';

    if (hasPlan) {
      mainText = plan.destination || (plan.mustBeAt ? 'Учёба / дела' : 'Рабочий день');
      const parts = [];
      if (plan.plannedArrival) parts.push(`приход ${plan.plannedArrival}`);
      if (normal != null) parts.push(`норма ${timeFromMinutes(normal)}`);
      if (plan.mustBeAt) parts.push(`быть к ${plan.mustBeAt}`);
      if (needLeave != null) parts.push(`уйти ${timeFromMinutes(needLeave)}`);
      subText = parts.join(' · ') || 'План сохранён';
      if (delta != null) {
        badge = formatSigned(delta);
        badgeClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
      } else {
        badge = 'по норме';
        badgeClass = 'neutral';
      }
    }

    if (entry.actualLeave) {
      const actualDelta = entryDelta(date, entry);
      badge = actualDelta == null ? 'заполнено' : formatSigned(actualDelta);
      badgeClass = actualDelta > 0 ? 'positive' : actualDelta < 0 ? 'negative' : 'neutral';
    }

    row.innerHTML = `
      <div class="week-plan-date">
        <strong>${WEEKDAYS[date.getDay()]}</strong>
        <span>${formatDateLong(date)}</span>
      </div>
      <div class="week-plan-info">
        <strong>${escapeHtml(mainText)}</strong>
        <span>${escapeHtml(subText)}</span>
      </div>
      <span class="week-plan-badge ${badgeClass}">${escapeHtml(badge)}</span>
    `;
    row.addEventListener('click', () => openWeekPlanDialog(key));
    root.appendChild(row);
  }
}

function renderPlans() {
  const start = shownPlanWeekStart;
  const end = addDays(start, 6);
  const weekKey = isoDate(start);
  $('weekRange').textContent = `${formatDateLong(start)} — ${formatDateLong(end)}`;

  renderWeekPlanner();

  const completions = state.planCompletions[weekKey] || {};
  const root = $('plansList');
  root.innerHTML = '';

  for (const dayInfo of PLAN_DAYS) {
    const tasks = state.planTemplates.filter(t => Number(t.day) === dayInfo.value);
    if (!tasks.length) continue;
    const block = document.createElement('section');
    block.className = 'plan-day';
    block.innerHTML = `<h3>${dayInfo.label}</h3>`;

    tasks.forEach(task => {
      const row = document.createElement('label');
      row.className = `plan-item${completions[task.id] ? ' done' : ''}`;
      row.innerHTML = `
        <input type="checkbox" ${completions[task.id] ? 'checked' : ''} />
        <span>${escapeHtml(task.text)}</span>
        <button type="button" class="plan-delete" aria-label="Удалить">×</button>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        state.planCompletions[weekKey] = state.planCompletions[weekKey] || {};
        state.planCompletions[weekKey][task.id] = e.target.checked;
        saveState();
        renderPlans();
      });
      row.querySelector('.plan-delete').addEventListener('click', (e) => {
        e.preventDefault();
        state.planTemplates = state.planTemplates.filter(t => t.id !== task.id);
        Object.values(state.planCompletions).forEach(obj => delete obj[task.id]);
        saveState();
        renderPlans();
        showToast('План удалён');
      });
      block.appendChild(row);
    });
    root.appendChild(block);
  }

  if (!state.planTemplates.length) {
    root.innerHTML = `<section class="plan-day"><h3>Пока пусто</h3><div class="plan-empty">Здесь можно хранить повторяющиеся дела. Галочки начинаются заново каждую неделю.</div></section>`;
  }
}

function renderAll() {
  renderHeader();
  renderHome();
  renderSchedule();
  renderPlans();
}

function openEntryDialog(key) {
  const date = fromIso(key);
  const entry = state.entries[key] || {};
  const plan = getEffectivePlan(key, entry);
  $('entryDate').value = key;
  $('entryDialogTitle').textContent = `${formatDateLong(date)}, ${WEEKDAYS_SHORT[date.getDay()]}`;
  $('arrivalInput').value = entry.arrival || '';
  $('actualLeaveInput').value = entry.actualLeave || '';
  $('mustBeAtInput').value = entry.mustBeAt || plan.mustBeAt || '';
  $('commuteInput').value = entry.commuteMinutes ?? plan.commuteMinutes ?? state.settings.defaultCommute;
  $('destinationInput').value = entry.destination || plan.destination || '';
  $('noteInput').value = entry.note || '';
  $('entryValidation').hidden = true;
  updateEntryPreview();
  $('entryDialog').showModal();
}

function updateEntryPreview() {
  const key = $('entryDate').value;
  if (!key) return;
  const date = fromIso(key);
  const arrival = $('arrivalInput').value;
  const req = requiredLeave(date, arrival);
  $('requiredLeavePreview').textContent = req == null ? (requiredMinutesForDate(date) ? '—' : 'Выходной') : timeFromMinutes(req);

  const must = minutesFromTime($('mustBeAtInput').value);
  const commute = Number($('commuteInput').value || 0);
  $('plannedLeavePreview').textContent = must == null ? 'Время ухода по плану: —' : `Время ухода по плану: ${timeFromMinutes(must - commute)}`;
}

function validateEntry() {
  const arrival = minutesFromTime($('arrivalInput').value);
  const leave = minutesFromTime($('actualLeaveInput').value);
  const messages = [];
  let blocking = false;

  if (arrival != null && leave != null && leave < arrival) {
    messages.push('Время ухода не может быть раньше времени прихода');
    blocking = true;
  }
  const earliest = minutesFromTime(state.settings.earliest);
  const latest = minutesFromTime(state.settings.latest);
  if (arrival != null && earliest != null && arrival < earliest) messages.push(`Приход раньше ${state.settings.earliest} — проверь время`);
  if (leave != null && latest != null && leave > latest) messages.push(`Уход позже ${state.settings.latest} — проверь время`);

  const validation = $('entryValidation');
  validation.hidden = messages.length === 0;
  validation.textContent = messages.join(' · ');
  return !blocking;
}

function saveEntryFromDialog() {
  if (!validateEntry()) return false;
  const key = $('entryDate').value;
  const data = {
    arrival: $('arrivalInput').value,
    actualLeave: $('actualLeaveInput').value,
    mustBeAt: $('mustBeAtInput').value,
    commuteMinutes: Number($('commuteInput').value || state.settings.defaultCommute),
    destination: $('destinationInput').value.trim(),
    note: $('noteInput').value.trim()
  };
  const hasData = Object.entries(data).some(([k, v]) => k === 'commuteMinutes' ? false : Boolean(v));
  if (hasData) state.entries[key] = data;
  else delete state.entries[key];
  saveState();
  renderAll();
  return true;
}

function openWeekPlanDialog(key) {
  const date = fromIso(key);
  const plan = state.weekPlans[key] || {};
  $('weekPlanDate').value = key;
  $('weekPlanDialogTitle').textContent = `${WEEKDAYS[date.getDay()]}, ${formatDateLong(date)}`;
  $('plannedArrivalInput').value = plan.plannedArrival || state.settings.defaultPlannedArrival;
  $('weekMustBeAtInput').value = plan.mustBeAt || '';
  $('weekCommuteInput').value = plan.commuteMinutes ?? state.settings.defaultCommute;
  $('weekDestinationInput').value = plan.destination || '';
  updateWeekPlanPreview();
  $('weekPlanDialog').showModal();
}

function updateWeekPlanPreview() {
  const key = $('weekPlanDate').value;
  if (!key) return;
  const date = fromIso(key);
  const plan = {
    plannedArrival: $('plannedArrivalInput').value,
    mustBeAt: $('weekMustBeAtInput').value,
    commuteMinutes: Number($('weekCommuteInput').value || state.settings.defaultCommute),
    destination: $('weekDestinationInput').value.trim()
  };
  const normal = requiredLeave(date, plan.plannedArrival);
  const need = plannedLeave(plan);
  const delta = planDelta(date, plan);

  $('weekNormalLeave').textContent = normal == null ? (requiredMinutesForDate(date) ? '—' : 'Выходной') : timeFromMinutes(normal);
  $('weekNeedLeave').textContent = need == null ? '—' : timeFromMinutes(need);

  let text = 'Укажи время, чтобы увидеть расчёт';
  if (normal != null && need == null) {
    text = `Если прийти в ${plan.plannedArrival}, рабочий день закончится в ${timeFromMinutes(normal)}`;
  } else if (normal != null && need != null) {
    if (delta === 0) text = 'Можно уйти ровно по норме — баланс за день не изменится';
    else if (delta > 0) text = `Получится накопить ${formatDuration(delta)} за этот день`;
    else text = `Для раннего ухода понадобится ${formatDuration(delta)} из баланса`;
  } else if (!requiredMinutesForDate(date)) {
    text = 'По обычному графику это выходной';
  }
  $('weekPlanDeltaText').textContent = text;
}

function saveWeekPlanFromDialog() {
  const key = $('weekPlanDate').value;
  const plan = {
    plannedArrival: $('plannedArrivalInput').value,
    mustBeAt: $('weekMustBeAtInput').value,
    commuteMinutes: Math.max(0, Math.min(240, Number($('weekCommuteInput').value || state.settings.defaultCommute))),
    destination: $('weekDestinationInput').value.trim()
  };
  const hasData = Boolean(plan.plannedArrival || plan.mustBeAt || plan.destination);
  if (hasData) state.weekPlans[key] = plan;
  else delete state.weekPlans[key];
  saveState();
  renderAll();
}

function markNow(field) {
  const now = new Date();
  const key = isoDate(now);
  state.entries[key] = state.entries[key] || { commuteMinutes: state.settings.defaultCommute };
  state.entries[key][field] = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  saveState();
  renderAll();
  showToast(field === 'arrival' ? 'Приход отмечен' : 'Уход отмечен');
}

function openSettings() {
  $('regularDurationInput').value = durationText(state.settings.regularMinutes);
  $('fridayDurationInput').value = durationText(state.settings.fridayMinutes);
  $('earliestInput').value = state.settings.earliest;
  $('latestInput').value = state.settings.latest;
  $('periodStartDayInput').value = state.settings.periodStartDay;
  $('defaultCommuteInput').value = state.settings.defaultCommute;
  $('defaultPlannedArrivalInput').value = state.settings.defaultPlannedArrival;
  $('settingsDialog').showModal();
}

function exportBackup() {
  const payload = {
    app: 'Мой график',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moy-grafik-backup-${isoDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Резервная копия создана');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed.data || parsed;
      if (!data.settings || !data.entries) throw new Error('bad format');
      state = {
        settings: { ...DEFAULT_STATE.settings, ...data.settings },
        entries: data.entries || {},
        weekPlans: data.weekPlans || {},
        planTemplates: data.planTemplates || [],
        planCompletions: data.planCompletions || {}
      };
      saveState();
      shownPeriodStart = getPeriodStart(new Date());
      shownPlanWeekStart = weekStart(new Date());
      shownCalendarMonth = monthStart(new Date());
      renderAll();
      showToast('Данные восстановлены');
    } catch {
      showToast('Не удалось прочитать копию');
    }
  };
  reader.readAsText(file);
}

function openCalendarDay(key) {
  const date = fromIso(key);
  const today = dateOnly(new Date());
  if (date > today) openWeekPlanDialog(key);
  else openEntryDialog(key);
}

function initEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === tab.dataset.target));
      const titles = { home: 'Сегодня', schedule: 'График', plans: 'Планы' };
      $('screenTitle').textContent = titles[tab.dataset.target];
      window.scrollTo(0, 0);
    });
  });

  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', () => $('settingsDialog').close());
  $('closeEntryBtn').addEventListener('click', () => $('entryDialog').close());
  $('closeWeekPlanBtn').addEventListener('click', () => $('weekPlanDialog').close());
  $('closePlanBtn').addEventListener('click', () => $('planDialog').close());

  $('editTodayBtn').addEventListener('click', () => openEntryDialog(isoDate(new Date())));
  $('arriveNowBtn').addEventListener('click', () => markNow('arrival'));
  $('leaveNowBtn').addEventListener('click', () => markNow('actualLeave'));

  ['arrivalInput', 'mustBeAtInput', 'commuteInput'].forEach(id => $(id).addEventListener('input', updateEntryPreview));
  ['arrivalInput', 'actualLeaveInput'].forEach(id => $(id).addEventListener('input', validateEntry));

  $('entryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (saveEntryFromDialog()) {
      $('entryDialog').close();
      showToast('День сохранён');
    }
  });

  $('deleteEntryBtn').addEventListener('click', () => {
    const key = $('entryDate').value;
    delete state.entries[key];
    saveState();
    renderAll();
    $('entryDialog').close();
    showToast('День очищен');
  });

  $('prevPeriodBtn').addEventListener('click', () => {
    shownPeriodStart = shiftPeriod(shownPeriodStart, -1);
    renderSchedule();
  });
  $('nextPeriodBtn').addEventListener('click', () => {
    const next = shiftPeriod(shownPeriodStart, 1);
    const current = getPeriodStart(new Date());
    if (next <= current) shownPeriodStart = next;
    renderSchedule();
  });
  $('periodPickerBtn').addEventListener('click', () => {
    shownPeriodStart = getPeriodStart(new Date());
    renderSchedule();
  });

  $('prevMonthBtn').addEventListener('click', () => {
    shownCalendarMonth = shiftMonth(shownCalendarMonth, -1);
    renderCalendar();
  });
  $('nextMonthBtn').addEventListener('click', () => {
    shownCalendarMonth = shiftMonth(shownCalendarMonth, 1);
    renderCalendar();
  });
  $('calendarTodayBtn').addEventListener('click', () => {
    shownCalendarMonth = monthStart(new Date());
    renderCalendar();
  });

  $('prevWeekBtn').addEventListener('click', () => {
    shownPlanWeekStart = addDays(shownPlanWeekStart, -7);
    renderPlans();
  });
  $('nextWeekBtn').addEventListener('click', () => {
    shownPlanWeekStart = addDays(shownPlanWeekStart, 7);
    renderPlans();
  });
  $('currentWeekBtn').addEventListener('click', () => {
    shownPlanWeekStart = weekStart(new Date());
    renderPlans();
  });

  ['plannedArrivalInput', 'weekMustBeAtInput', 'weekCommuteInput', 'weekDestinationInput'].forEach(id => {
    $(id).addEventListener('input', updateWeekPlanPreview);
  });
  $('weekPlanForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveWeekPlanFromDialog();
    $('weekPlanDialog').close();
    showToast('План дня сохранён');
  });
  $('deleteWeekPlanBtn').addEventListener('click', () => {
    const key = $('weekPlanDate').value;
    delete state.weekPlans[key];
    saveState();
    renderAll();
    $('weekPlanDialog').close();
    showToast('План дня очищен');
  });

  $('addPlanBtn').addEventListener('click', () => {
    $('planTextInput').value = '';
    $('planDayInput').value = String(new Date().getDay());
    $('planDialog').showModal();
  });
  $('planForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('planTextInput').value.trim();
    if (!text) return;
    state.planTemplates.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, day: Number($('planDayInput').value), text });
    saveState();
    renderPlans();
    $('planDialog').close();
    showToast('План добавлен');
  });

  $('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const regular = parseDuration($('regularDurationInput').value);
    const friday = parseDuration($('fridayDurationInput').value);
    if (regular == null || friday == null) {
      showToast('Проверь длительность: например 9:00 и 7:45');
      return;
    }
    state.settings.regularMinutes = regular;
    state.settings.fridayMinutes = friday;
    state.settings.earliest = $('earliestInput').value || '07:00';
    state.settings.latest = $('latestInput').value || '21:00';
    state.settings.periodStartDay = Math.max(1, Math.min(28, Number($('periodStartDayInput').value || 20)));
    state.settings.defaultCommute = Math.max(0, Math.min(240, Number($('defaultCommuteInput').value || 0)));
    state.settings.defaultPlannedArrival = $('defaultPlannedArrivalInput').value || '07:30';
    saveState();
    shownPeriodStart = getPeriodStart(new Date());
    renderAll();
    $('settingsDialog').close();
    showToast('Настройки сохранены');
  });

  $('exportBtn').addEventListener('click', exportBackup);
  $('importInput').addEventListener('change', (e) => {
    if (e.target.files?.[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });
}

function initPlanDays() {
  $('planDayInput').innerHTML = PLAN_DAYS.map(d => `<option value="${d.value}">${d.label}</option>`).join('');
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

initPlanDays();
initEvents();
renderAll();
initServiceWorker();
setInterval(renderHome, 30000);

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
  0: [
    'Воскресенье: зарядка нужна не только телефону.',
    'План на воскресенье: оставить немного времени без плана.',
    'Завтра новая неделя. Сегодня можно просто выдохнуть.',
    'Воскресенье напоминает: отдых — тоже полезное дело.'
  ],
  1: [
    'Понедельник. Начнём с малого — хотя бы с кофе.',
    'Новая неделя не требует новой личности. Достаточно первого шага.',
    'Понедельник — загрузка недели. Не нажимай на себя слишком часто.',
    'Сегодня не нужно успеть всё. Выбери главное и начни.'
  ],
  2: [
    'Вторник: понедельник пройден, опыт получен.',
    'Вторник — хороший день, чтобы похвалить себя за маленький прогресс.',
    'По одному делу за раз. Даже во вторник у тебя только две руки.',
    'Вторник. Уже в ритме, ещё без пятничной суеты.'
  ],
  3: [
    'Среда — экватор недели. Можно выдохнуть.',
    'Среда: половина пути позади. Ты уже многое сделала.',
    'Середина недели — самое время добавить в планы что-то приятное.',
    'Среда. Если силы на 40%, план на 140% можно пересмотреть.'
  ],
  4: [
    'Четверг: пятница уже машет из-за угла.',
    'Четверг — почти пятница, только с более серьёзным лицом.',
    'Не всё срочное — главное. Особенно в четверг.',
    'Четверг. Ещё немного дел — и немного заботы о себе.'
  ],
  5: [
    'Пятница. У списка дел тоже должен быть конец.',
    'Пятница: закрываем задачи, открываем планы на приятное.',
    'Не обязательно закончить всё, чтобы заслужить отдых.',
    'Пятница — хороший повод заметить, сколько уже получилось.'
  ],
  6: [
    'Суббота: в расписании должно быть место для себя.',
    'Субботний план: меньше «надо», больше «хочется».',
    'Даже если суббота занята, маленькая пауза всё равно твоя.',
    'Суббота. Кофе можно пить просто так, а не для ускорения.'
  ]
};

function quoteForDay(date) {
  const quotes = QUOTES[date.getDay()];
  // Local calendar date, independent of DST. Each weekday rotates weekly.
  const week = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 604800000);
  return quotes[((week % quotes.length) + quotes.length) % quotes.length];
}

let state = ScheduleData.normalize(DEFAULT_STATE);
const store = new ScheduleStore();
let lastSaved = structuredClone(state);
let saving = false;
let ready = false;
let failedDraft = null;
let undoState = null;
let undoRevision = null;
let pendingImport = null;
let importReason = 'Импорт копии';
let lastBackup = null;
let shownPeriodStart = getPeriodStart(new Date());
let shownPlanWeekStart = weekStart(new Date());
let shownCalendarMonth = monthStart(new Date());
let toastTimer = null;

const $ = (id) => document.getElementById(id);

async function saveState(reason = 'Изменение данных', recovery = false) {
  if (saving || (!ready && !recovery)) {
    state = structuredClone(lastSaved);
    showToast('Сохранение недоступно. Открой раздел «Данные».');
    return false;
  }
  saving = true;
  $('saveStatus').textContent = 'Сохраняем…';
  const previous = structuredClone(lastSaved);
  try {
    state = await store.commit(state, reason);
    lastSaved = structuredClone(state);
    undoState = previous;
    undoRevision = store.revision;
    ready = true;
    failedDraft = null;
    $('dataAlert').hidden = true;
    $('undoBtn').hidden = false;
    renderDataStatus();
    return true;
  } catch (error) {
    failedDraft = structuredClone(state);
    state = previous;
    showDataError(error.message);
    showToast('Изменения не сохранены. Поля формы можно исправить и повторить.');
    renderAll();
    return false;
  } finally {
    saving = false;
  }
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
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timeFromMinutes(total) {
  if (total == null || Number.isNaN(total)) return '—';
  const normalized = ((total % 1440) + 1440) % 1440;
  const offset = Math.floor(total / 1440);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}${offset ? ` (${offset > 0 ? '+' : ''}${offset} дн.)` : ''}`;
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
  const fixed = state.entries[isoDate(date)]?.requiredMinutes;
  if (fixed != null) return fixed;
  const day = date.getDay();
  if (day === 0 || day === 6) return 0;
  if (day === 5) return state.settings.fridayMinutes;
  return state.settings.regularMinutes;
}

function requiredLeave(date, arrival) {
  const start = minutesFromTime(arrival);
  if (start == null) return null;
  const required = requiredMinutesForDate(date);
  const pause = state.entries[isoDate(date)]?.breakMinutes || 0;
  return start + required + pause;
}

function plannedLeave(plan) {
  const must = minutesFromTime(plan?.mustBeAt);
  if (must == null) return null;
  const commute = Number.isFinite(Number(plan?.commuteMinutes)) ? Number(plan.commuteMinutes) : state.settings.defaultCommute;
  return must - commute;
}

function getEffectivePlan(key, entry = state.entries[key] || {}, weekly = state.weekPlans[key] || {}) {
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
  const start = minutesFromTime(entry.arrival);
  const actual = minutesFromTime(entry.actualLeave);
  if (start == null || actual == null || actual < start) return null;
  return actual - start - (entry.breakMinutes || 0) - (entry.requiredMinutes ?? requiredMinutesForDate(date));
}

function formatSignedMinutes(minutes) {
  const value = Math.round(minutes);
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)} мин`;
}

// One source for daily badges, the week's total and the unsaved editor preview.
function dayForecast(date, weeklyOverride) {
  const key = isoDate(date);
  const entry = state.entries[key] || {};
  const plan = getEffectivePlan(key, entry, weeklyOverride);
  const actual = entryDelta(date, entry);
  if (actual != null) return { delta: actual, source: 'actual', plan };
  const hasPlan = Boolean(plan.plannedArrival || plan.mustBeAt || plan.destination);
  const arrival = entry.arrival || plan.plannedArrival;
  const start = minutesFromTime(arrival);
  if (entry.actualLeave || !hasPlan || start == null) {
    return { delta: null, source: 'missing', plan, arrival, needsInput: Boolean(requiredMinutesForDate(date) || hasPlan || entry.arrival || entry.actualLeave) };
  }
  const normal = requiredLeave(date, arrival);
  const leave = plan.mustBeAt ? plannedLeave(plan) : normal;
  const pause = entry.breakMinutes || 0;
  if (!Number.isFinite(leave) || leave < start + pause || leave >= 1440) {
    return { delta: null, source: 'invalid', plan, arrival, normal, leave, needsInput: true };
  }
  return { delta: leave - normal, source: 'plan', plan, arrival, normal, leave };
}

function weekForecast(start, draft = null) {
  const result = { total: 0, actual: 0, planned: 0, actualDays: 0, plannedDays: 0, missingDays: 0, invalidDays: 0 };
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(start, offset);
    const forecast = dayForecast(date, draft?.key === isoDate(date) ? draft.plan : undefined);
    if (forecast.source === 'actual') { result.actual += forecast.delta; result.actualDays++; }
    else if (forecast.source === 'plan') { result.planned += forecast.delta; result.plannedDays++; }
    else if (forecast.source === 'invalid') result.invalidDays++;
    else if (forecast.needsInput) result.missingDays++;
  }
  result.total = result.actual + result.planned;
  return result;
}

function forecastCoverage(result) {
  const count = result.actualDays + result.plannedDays;
  const parts = [`Учтено дней: ${count}`];
  if (result.missingDays) parts.push(`не заполнено: ${result.missingDays}`);
  if (result.invalidDays) parts.push(`проверь время: ${result.invalidDays}`);
  return parts.join(' · ');
}

function renderWeekTotal() {
  const result = weekForecast(shownPlanWeekStart);
  const hasData = result.actualDays + result.plannedDays > 0;
  $('weekTotal').textContent = hasData ? formatSignedMinutes(result.total) : '—';
  setBalanceStyle($('weekTotal'), result.total);
  $('weekTotalBreakdown').textContent = hasData
    ? `Факт: ${formatSignedMinutes(result.actual)} · По плану: ${formatSignedMinutes(result.planned)}`
    : 'Добавь план дня, чтобы увидеть итог.';
  $('weekTotalCoverage').textContent = forecastCoverage(result);
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
  (document.querySelector('dialog[open]') || document.body).appendChild(el);
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 6500);
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
  $('homeQuote').textContent = quoteForDay(today);
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
  $('arriveNowBtn').disabled = Boolean(entry.arrival) || !ready;
  $('arriveNowBtn').textContent = entry.arrival ? `Приход ${entry.arrival} ✓` : 'Я пришла';
  $('leaveNowBtn').disabled = !entry.arrival || Boolean(entry.actualLeave) || !ready;
  $('leaveNowBtn').textContent = entry.actualLeave ? `Уход ${entry.actualLeave} ✓` : 'Я ушла';

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
    const zeroBalanceLeave = Math.max(minutesFromTime(arrivalForCalc), normal - balanceBeforeToday);
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

    if (zeroBalanceLeave > minutesFromTime(state.settings.latest)) text += ' · весь долг не поместится в рабочий день — распредели его на другие дни';
    if (pLeave != null && pLeave < minutesFromTime(arrivalForCalc)) text += ' · план пересекается с началом работы: проверь время';
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
    button.setAttribute('aria-label', `${formatDateLong(date)}${delta == null ? '' : `, ${formatSigned(delta)}`}${hasStudyPlan ? ', есть план' : ''}${entry.arrival && !entry.actualLeave ? ', не указан уход' : ''}`);
    if (key === todayKey) button.setAttribute('aria-current','date');
    button.innerHTML = `<span class="calendar-number">${day}</span>${delta ? `<span class="calendar-sign" aria-hidden="true">${delta > 0 ? '+' : '−'}</span>` : ''}${hasStudyPlan ? '<i class="study-marker" aria-hidden="true"></i>' : ''}`;
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
    if (!$('showEmptyDays').checked && !entry && !weeklyPlan) continue;
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
      ? `${escapeHtml(plan.destination || 'После работы')} · быть к ${escapeHtml(plan.mustBeAt)}${pLeave != null ? ` · уйти до ${timeFromMinutes(pLeave)}` : ''}`
      : weeklyPlan?.plannedArrival
        ? `Плановый приход ${escapeHtml(weeklyPlan.plannedArrival)}${req != null ? ` · по норме до ${timeFromMinutes(req)}` : ''}`
        : '';

    card.innerHTML = `
      <div class="day-card-head">
        <div class="day-date"><strong>${formatDateShort(date)}</strong><span>${WEEKDAYS_SHORT[date.getDay()]}</span></div>
        <span class="delta ${deltaClass}">${delta == null ? '—' : formatSigned(delta)}</span>
      </div>
      ${hasAnyData ? `
        <div class="day-times">
          <div><span>${arrivalLabel}</span><strong>${escapeHtml(arrivalText)}</strong></div>
          <div><span>Норма</span><strong>${req == null ? '—' : timeFromMinutes(req)}</strong></div>
          <div><span>План</span><strong>${pLeave == null ? '—' : timeFromMinutes(pLeave)}</strong></div>
          <div><span>Уход</span><strong>${escapeHtml(entry?.actualLeave || '—')}</strong></div>
        </div>
        ${planText ? `<div class="day-plan">${planText}</div>` : ''}
      ` : `<div class="empty-day">Нажми, чтобы заполнить день</div>`}
    `;

    card.addEventListener('click', async () => {
      if (date > today && weeklyPlan) openWeekPlanDialog(key);
      else openEntryDialog(key);
    });
    list.appendChild(card);
  }
  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'notice';
    empty.textContent = 'В этом периоде пока нет записей. Выбери день в календаре, чтобы добавить первую.';
    list.appendChild(empty);
  }
}

function renderWeekPlanner() {
  renderWeekTotal();
  const root = $('weekPlannerList');
  root.innerHTML = '';
  const today = dateOnly(new Date());

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(shownPlanWeekStart, offset);
    const key = isoDate(date);
    const forecast = dayForecast(date);
    const plan = forecast.plan;
    const entry = state.entries[key] || {};
    const hasPlan = Boolean(plan.plannedArrival || plan.mustBeAt || plan.destination);
    const normal = requiredLeave(date, entry.arrival || plan.plannedArrival);
    const needLeave = plannedLeave(plan);
    const delta = forecast.delta;

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
      if (entry.arrival || plan.plannedArrival) parts.push(`приход ${entry.arrival || plan.plannedArrival}${entry.arrival ? ' (факт)' : ''}`);
      if (normal != null) parts.push(`норма ${timeFromMinutes(normal)}`);
      if (plan.mustBeAt) parts.push(`быть к ${plan.mustBeAt}`);
      if (needLeave != null) parts.push(`уйти ${timeFromMinutes(needLeave)}`);
      subText = parts.join(' · ') || 'План сохранён';
      if (delta != null) {
        badge = formatSigned(delta);
        badgeClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
      } else {
        badge = forecast.source === 'invalid' ? 'проверь время' : 'нужно время';
        badgeClass = 'neutral';
      }
    }

    if (entry.actualLeave) {
      const actualDelta = entryDelta(date, entry);
      badge = actualDelta == null ? 'заполнено' : formatSigned(actualDelta);
      badgeClass = actualDelta > 0 ? 'positive' : actualDelta < 0 ? 'negative' : 'neutral';
      if (!hasPlan) {
        mainText = 'Рабочий день учтён';
        subText = `${entry.arrival || '—'} — ${entry.actualLeave}`;
      }
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
      const row = document.createElement('div');
      row.className = `plan-item${completions[task.id] ? ' done' : ''}`;
      row.innerHTML = `
        <input type="checkbox" id="task-${task.id}" ${completions[task.id] ? 'checked' : ''} />
        <label for="task-${task.id}"><span>${escapeHtml(task.text)}</span></label>
        <button type="button" class="plan-delete" aria-label="Удалить">×</button>
      `;
      row.querySelector('input').addEventListener('change', async (e) => {
        state.planCompletions[weekKey] = state.planCompletions[weekKey] || {};
        state.planCompletions[weekKey][task.id] = e.target.checked;
        if (!(await saveState('Отметка дела'))) return false;
        renderPlans();
      });
      row.querySelector('.plan-delete').addEventListener('click', async (e) => {
        e.preventDefault();
        state.planTemplates = state.planTemplates.filter(t => t.id !== task.id);
        Object.values(state.planCompletions).forEach(obj => delete obj[task.id]);
        if (!(await saveState('Удаление дела'))) return false;
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
  renderIncomplete();
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
  $('dayNormInput').value = durationText(entry.requiredMinutes ?? requiredMinutesForDate(date));
  $('breakInput').value = entry.breakMinutes || 0;
  $('entryValidation').hidden = true;
  updateEntryPreview();
  $('entryDialog').showModal();
}

function updateEntryPreview() {
  const key = $('entryDate').value;
  if (!key) return;
  const date = fromIso(key);
  const arrival = $('arrivalInput').value;
  const start = minutesFromTime(arrival);
  const norm = parseDuration($('dayNormInput').value);
  const req = start == null || norm == null ? null : start + norm + Number($('breakInput').value || 0);
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
  const norm = parseDuration($('dayNormInput').value);
  const pause = Number($('breakInput').value || 0);
  if (norm == null || norm > 1439) { messages.push('Норма дня: от 0:00 до 23:59'); blocking = true; }
  if (!Number.isInteger(pause) || pause < 0 || pause > 480 || (arrival != null && leave != null && pause > leave - arrival)) {
    messages.push('Проверь длительность перерыва'); blocking = true;
  }

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

async function saveEntryFromDialog() {
  if (!validateEntry()) return false;
  const key = $('entryDate').value;
  const data = {
    arrival: $('arrivalInput').value,
    actualLeave: $('actualLeaveInput').value,
    mustBeAt: $('mustBeAtInput').value,
    commuteMinutes: Number($('commuteInput').value || state.settings.defaultCommute),
    destination: $('destinationInput').value.trim(),
    note: $('noteInput').value.trim(),
    requiredMinutes: parseDuration($('dayNormInput').value),
    breakMinutes: Number($('breakInput').value || 0)
  };
  state.entries[key] = data;
  if (!(await saveState('Запись дня'))) return false;
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
  const preview = weekForecast(weekStart(date), { key, plan });
  const hasData = preview.actualDays + preview.plannedDays > 0;
  $('weekTotalPreview').textContent = hasData ? formatSignedMinutes(preview.total) : '—';
  setBalanceStyle($('weekTotalPreview'), preview.total);
  $('weekTotalPreviewHint').textContent = `${forecastCoverage(preview)}. ${entryDelta(date, state.entries[key]) != null ? 'Этот день завершён: в итог входит факт.' : 'Предпросмотр с текущими полями. Изменения ещё не сохранены.'}`;
}

async function saveWeekPlanFromDialog() {
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
  if (!(await saveState('План дня'))) return false;
  renderAll();
  return true;
}

async function markNow(field) {
  const now = new Date();
  const key = isoDate(now);
  if (!ready || state.entries[key]?.[field]) return;
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (field === 'actualLeave' && (!state.entries[key]?.arrival || currentTime < state.entries[key].arrival)) {
    showToast('Сначала проверь время прихода в записи дня');
    return;
  }
  state.entries[key] = state.entries[key] || { commuteMinutes: state.settings.defaultCommute };
  state.entries[key][field] = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (!(await saveState())) return false;
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

function downloadJson(payload, name) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportBackup() {
  if (!ready && !failedDraft) {
    if (store.raw) downloadJson({ original: store.raw }, `grafik-recovery-${isoDate(new Date())}.json`);
    else showToast('Нет доступных данных для выгрузки');
    return;
  }
  downloadJson({ app: 'Мой график', version: 3, exportedAt: new Date().toISOString(), data: failedDraft || state }, `moy-grafik-backup-${isoDate(new Date())}.json`);
  showToast('Копия передана браузеру. Проверь файл в загрузках.');
  // Browser download dispatch does not prove that a file has been saved by the user.
  if (!failedDraft) {
    lastBackup = new Date().toISOString();
    try { await store.setMeta('lastExport',lastBackup); } catch { /* Export remains usable. */ }
    renderDataStatus();
  }
}

async function importBackup(file) {
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error('Копия слишком большая. Максимум 8 МБ.');
    pendingImport = ScheduleData.parseBackup(await file.text());
    importReason = 'Импорт копии';
    previewImport();
  } catch (error) {
    showToast(`Не удалось открыть копию: ${error.message}`);
  }
}

function previewImport() {
  $('importSummary').textContent = `В копии: ${Object.keys(pendingImport.entries).length} дней, ${Object.keys(pendingImport.weekPlans).length} планов и ${pendingImport.planTemplates.length} дел. Перед восстановлением текущая версия останется в истории.`;
  $('mergeImportBtn').hidden = !ready;
  $('importDialog').showModal();
}

function openCalendarDay(key) {
  const date = fromIso(key);
  const today = dateOnly(new Date());
  if (date > today) openWeekPlanDialog(key);
  else openEntryDialog(key);
}

function initEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.tab').forEach(t => { t.classList.toggle('active', t === tab); if (t === tab) t.setAttribute('aria-current','page'); else t.removeAttribute('aria-current'); });
      document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === tab.dataset.target));
      const titles = { home: 'Сегодня', schedule: 'График', plans: 'Планы' };
      $('screenTitle').textContent = titles[tab.dataset.target];
      window.scrollTo(0, 0);
    });
  });

  $('settingsBtn').addEventListener('click', openSettings);
  $('showEmptyDays').addEventListener('change', renderSchedule);
  $('closeSettingsBtn').addEventListener('click', () => $('settingsDialog').close());
  $('closeEntryBtn').addEventListener('click', () => $('entryDialog').close());
  $('closeWeekPlanBtn').addEventListener('click', () => $('weekPlanDialog').close());
  $('closePlanBtn').addEventListener('click', () => $('planDialog').close());

  $('editTodayBtn').addEventListener('click', () => openEntryDialog(isoDate(new Date())));
  $('arriveNowBtn').addEventListener('click', () => markNow('arrival'));
  $('leaveNowBtn').addEventListener('click', () => markNow('actualLeave'));

  ['arrivalInput', 'mustBeAtInput', 'commuteInput'].forEach(id => $(id).addEventListener('input', updateEntryPreview));
  ['arrivalInput', 'actualLeaveInput'].forEach(id => $(id).addEventListener('input', validateEntry));

  $('entryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await saveEntryFromDialog()) {
      $('entryDialog').close();
      showToast('День сохранён');
    }
  });

  $('deleteEntryBtn').addEventListener('click', async () => {
    const key = $('entryDate').value;
    delete state.entries[key];
    if (!(await saveState('Удаление дня'))) return false;
    renderAll();
    $('entryDialog').close();
    showToast('День очищен');
  });

  $('prevPeriodBtn').addEventListener('click', async () => {
    shownPeriodStart = shiftPeriod(shownPeriodStart, -1);
    renderSchedule();
  });
  $('nextPeriodBtn').addEventListener('click', async () => {
    const next = shiftPeriod(shownPeriodStart, 1);
    const current = getPeriodStart(new Date());
    if (next <= current) shownPeriodStart = next;
    renderSchedule();
  });
  $('periodPickerBtn').addEventListener('click', async () => {
    shownPeriodStart = getPeriodStart(new Date());
    renderSchedule();
  });

  $('prevMonthBtn').addEventListener('click', async () => {
    shownCalendarMonth = shiftMonth(shownCalendarMonth, -1);
    renderCalendar();
  });
  $('nextMonthBtn').addEventListener('click', async () => {
    shownCalendarMonth = shiftMonth(shownCalendarMonth, 1);
    renderCalendar();
  });
  $('calendarTodayBtn').addEventListener('click', async () => {
    shownCalendarMonth = monthStart(new Date());
    renderCalendar();
  });

  $('prevWeekBtn').addEventListener('click', async () => {
    shownPlanWeekStart = addDays(shownPlanWeekStart, -7);
    renderPlans();
  });
  $('nextWeekBtn').addEventListener('click', async () => {
    shownPlanWeekStart = addDays(shownPlanWeekStart, 7);
    renderPlans();
  });
  $('currentWeekBtn').addEventListener('click', async () => {
    shownPlanWeekStart = weekStart(new Date());
    renderPlans();
  });

  ['plannedArrivalInput', 'weekMustBeAtInput', 'weekCommuteInput', 'weekDestinationInput'].forEach(id => {
    $(id).addEventListener('input', updateWeekPlanPreview);
  });
  $('weekPlanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await saveWeekPlanFromDialog())) return;
    $('weekPlanDialog').close();
    showToast('План дня сохранён');
  });
  $('deleteWeekPlanBtn').addEventListener('click', async () => {
    const key = $('weekPlanDate').value;
    delete state.weekPlans[key];
    if (!(await saveState('Удаление плана'))) return false;
    renderAll();
    $('weekPlanDialog').close();
    showToast('План дня очищен');
  });

  $('addPlanBtn').addEventListener('click', async () => {
    $('planTextInput').value = '';
    $('planDayInput').value = String(new Date().getDay());
    $('planDialog').showModal();
  });
  $('planForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('planTextInput').value.trim();
    if (!text) return;
    state.planTemplates.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, day: Number($('planDayInput').value), text });
    if (!(await saveState('Добавление дела'))) return false;
    renderPlans();
    $('planDialog').close();
    showToast('План добавлен');
  });

  $('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const regular = parseDuration($('regularDurationInput').value);
    const friday = parseDuration($('fridayDurationInput').value);
    if (regular == null || friday == null || regular > 1439 || friday > 1439) {
      showToast('Длительность — от 0:00 до 23:59, например 9:00');
      return;
    }
    if (($('earliestInput').value || '07:00') >= ($('latestInput').value || '21:00')) {
      showToast('Начало рабочего дня должно быть раньше его окончания'); return;
    }
    state.settings.regularMinutes = regular;
    state.settings.fridayMinutes = friday;
    state.settings.earliest = $('earliestInput').value || '07:00';
    state.settings.latest = $('latestInput').value || '21:00';
    state.settings.periodStartDay = Math.max(1, Math.min(28, Number($('periodStartDayInput').value || 20)));
    state.settings.defaultCommute = Math.max(0, Math.min(240, Number($('defaultCommuteInput').value || 0)));
    state.settings.defaultPlannedArrival = $('defaultPlannedArrivalInput').value || '07:30';
    if (!(await saveState('Настройки графика'))) return false;
    shownPeriodStart = getPeriodStart(new Date());
    renderAll();
    $('settingsDialog').close();
    showToast('Настройки сохранены');
  });

  $('exportBtn').addEventListener('click', exportBackup);
  $('importInput').addEventListener('change', async (e) => {
    if (e.target.files?.[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });
}

function initPlanDays() {
  $('planDayInput').innerHTML = PLAN_DAYS.map(d => `<option value="${d.value}">${d.label}</option>`).join('');
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const offer = () => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        $('updateBtn').hidden = false;
        $('updateBtn').onclick = async () => {
          if (saving || failedDraft || document.querySelector('dialog[open]')) {
            showToast('Сначала сохрани изменения и закрой открытое окно'); return;
          }
          reg.waiting.postMessage({type:'SKIP_WAITING'});
        };
      }
    };
    offer();
    reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', offer));
  }).catch(() => {
    $('offlineStatus').textContent = 'Офлайн-режим недоступен: проверь соединение и адрес сайта';
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; location.reload(); }
  });
}

function showDataError(message) {
  $('dataAlert').hidden = false;
  $('dataAlertText').textContent = message;
  $('saveStatus').textContent = 'Есть проблема с сохранением';
  $('saveStatus').classList.add('error');
  $('dataHealth').textContent = message;
}

function renderDataStatus() {
  const format = value => new Date(value).toLocaleString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  $('saveStatus').textContent = failedDraft ? 'Есть несохранённые изменения' : ready ? 'Сохранено на устройстве' : 'Хранилище недоступно';
  $('saveStatus').classList.toggle('error', !ready || Boolean(failedDraft));
  $('dataHealth').textContent = store.savedAt ? `Последнее сохранение: ${format(store.savedAt)}. Предыдущие 30 версий доступны в истории.` : 'Нет сохранённой версии';
  $('backupStatus').textContent = lastBackup ? `Последняя выгрузка: ${format(lastBackup)}. Проверь, что файл сохранён.` : 'Внешней копии пока нет. Сохрани её в «Файлы», iCloud Drive или Google Drive.';
  const due = !lastBackup || Date.now() - new Date(lastBackup).getTime() > 7*86400000;
  $('backupReminder').hidden = !due || !Object.keys(state.entries).length;
}

function renderIncomplete() {
  const today = isoDate(new Date());
  const keys = Object.keys(state.entries).filter(k => k < today && state.entries[k].arrival && !state.entries[k].actualLeave).sort().reverse();
  $('incompleteCard').hidden = keys.length === 0;
  $('incompleteText').textContent = `Без времени ухода: ${keys.length}. Начнём с ${keys.length ? formatDateLong(fromIso(keys[0])) : ''}.`;
  $('incompleteBtn').onclick = () => keys.length && openEntryDialog(keys[0]);
}

async function openData() {
  $('dataDialog').showModal();
  renderDataStatus();
  if (failedDraft) $('dataHealth').textContent = 'Последнее изменение не сохранено. Скачай копию перед перезагрузкой.';
  $('historyList').replaceChildren();
  try {
    if (!store.db) throw new Error('История сейчас недоступна');
    const history = await store.history();
    if (!history.length) $('historyList').textContent = 'История появится после первого изменения.';
    history.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-item';
      const label = new Date(item.savedAt).toLocaleString('ru-RU');
      button.textContent = `${label} · до действия «${item.reason}» →`;
      button.addEventListener('click', () => {
        try {
          if (item.raw) {
            downloadJson({original:item.raw},'grafik-original-recovery.json');
            return;
          }
          pendingImport = ScheduleData.normalize(item.state);
          importReason = 'Восстановление из истории';
          previewImport();
        } catch { downloadJson(item,'grafik-damaged-version.json'); showToast('Эта версия повреждена. Исходник передан в загрузки для восстановления.'); }
      });
      $('historyList').appendChild(button);
    });
  } catch (error) { $('historyList').textContent = error.message; }
}

async function restoreImport(merge) {
  if (!pendingImport || saving) return;
  try {
    state = merge ? ScheduleData.merge(lastSaved,pendingImport) : structuredClone(pendingImport);
  } catch (error) {
    showToast(`Не удалось объединить данные: ${error.message}`);
    return;
  }
  if (!(await saveState(importReason,true))) return;
  pendingImport = null;
  shownPeriodStart = getPeriodStart(new Date());
  shownPlanWeekStart = weekStart(new Date());
  shownCalendarMonth = monthStart(new Date());
  $('importDialog').close();
  renderAll();
  showToast('Данные восстановлены. Предыдущая версия сохранена в истории.');
  if ($('dataDialog').open) { $('dataDialog').close(); openData(); }
}

function initDataEvents() {
  for (const id of ['dataBtn','alertDataBtn','backupReminderBtn','settingsDataBtn']) $(id).addEventListener('click', openData);
  $('closeDataBtn').addEventListener('click', () => $('dataDialog').close());
  $('importLabel').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('importInput').click(); } });
  $('closeImportBtn').addEventListener('click', () => { pendingImport = null; $('importDialog').close(); });
  $('mergeImportBtn').addEventListener('click', () => restoreImport(true));
  $('replaceImportBtn').addEventListener('click', () => restoreImport(false));
  $('reloadBtn').addEventListener('click', () => {
    if (failedDraft) { showToast('Сначала скачай несохранённую копию. После этого повтори запуск вручную.'); return; }
    location.reload();
  });
  $('persistBtn').addEventListener('click', async () => {
    try {
      const persistent = await navigator.storage?.persist?.();
      $('persistStatus').textContent = persistent ? 'Защита от автоматической очистки включена. Внешние копии всё равно нужны.' : 'Браузер не предоставил защиту. Установи приложение на главный экран и сохраняй внешние копии.';
    } catch { $('persistStatus').textContent = 'Защита недоступна в этом браузере. Сохраняй внешние копии.'; }
  });
  $('undoBtn').addEventListener('click', async () => {
    if (!undoState || undoRevision !== store.revision) return;
    state = structuredClone(undoState);
    if (await saveState('Отмена последнего действия')) {
      undoState = null;
      $('undoBtn').hidden = true;
      renderAll();
      showToast('Последнее действие отменено');
    }
  });
  ['dayNormInput','breakInput'].forEach(id => $(id).addEventListener('input', () => { updateEntryPreview(); validateEntry(); }));
  // Prevent overlapping mutations while an asynchronous transaction is running.
  for (const type of ['click','change','submit']) document.addEventListener(type, e => {
    if (saving) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('beforeunload', e => {
    if (saving || failedDraft) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('online', renderConnection);
  window.addEventListener('offline', renderConnection);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ready) renderAll(); });
}

function renderConnection() {
  $('offlineStatus').textContent = navigator.onLine ? 'Локальное приложение · облачная синхронизация не подключена' : 'Без интернета · изменения сохраняются на устройстве';
}

function initAppearance() {
  const controls = document.querySelectorAll('input[name="appearance"]');
  const sync = () => controls.forEach(input => { input.checked = input.value === ScheduleTheme.preference; });
  sync();
  window.addEventListener('appearancechange', sync);
  controls.forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    const saved = ScheduleTheme.set(input.value);
    $('themeHelp').textContent = saved
      ? 'Применяется сразу и запоминается на этом устройстве.'
      : 'Тема применена. Браузер не разрешил запомнить выбор после закрытия.';
  }));
}

async function boot() {
  initAppearance();
  initPlanDays();
  initEvents();
  initDataEvents();
  try {
    state = await store.open();
    lastSaved = structuredClone(state);
    ready = true;
    lastBackup = (await store.get('records','lastExport'))?.value || null;
    shownPeriodStart = getPeriodStart(new Date());
    renderDataStatus();
  } catch (error) {
    showDataError(`Не удалось открыть сохранённые данные. Исходная запись не удалена. Открой «Данные» для восстановления. ${error.message}`);
  }
  renderAll();
  renderConnection();
  initServiceWorker();
  let renderedDate = isoDate(new Date());
  setInterval(() => {
    if (!ready) return;
    const current = isoDate(new Date());
    if (current !== renderedDate) { renderedDate = current; renderAll(); } else renderHome();
  }, 30000);
}

boot();

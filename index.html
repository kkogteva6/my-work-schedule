const STORAGE_KEY = 'my-work-schedule-v1';

const DEFAULT_STATE = {
  settings: {
    regularMinutes: 540,
    fridayMinutes: 465,
    earliest: '07:00',
    latest: '21:00',
    periodStartDay: 20,
    defaultCommute: 50
  },
  entries: {},
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
let toastTimer = null;

const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    return {
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
      entries: saved.entries || {},
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

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
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

function plannedLeave(entry) {
  const must = minutesFromTime(entry?.mustBeAt);
  if (must == null) return null;
  const commute = Number.isFinite(Number(entry.commuteMinutes)) ? Number(entry.commuteMinutes) : state.settings.defaultCommute;
  return must - commute;
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

function renderHeader() {
  const now = new Date();
  $('todayDate').textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
}

function renderHome() {
  const now = new Date();
  const today = dateOnly(now);
  const key = isoDate(today);
  const entry = state.entries[key] || {};
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

  const req = requiredLeave(today, entry.arrival);
  $('requiredToday').textContent = req == null ? (requiredMinutesForDate(today) ? durationText(requiredMinutesForDate(today)) : 'Выходной') : timeFromMinutes(req);
  $('requiredHint').textContent = req == null ? (requiredMinutesForDate(today) ? 'Длительность рабочего дня' : 'По графику отдых') : `при приходе в ${entry.arrival}`;

  $('todayStatusTitle').textContent = requiredMinutesForDate(today) ? (day === 5 ? 'Короткая пятница' : 'Рабочий день') : 'Выходной';
  $('todayArrival').textContent = entry.arrival || '—';
  $('todayRequiredLeave').textContent = req == null ? '—' : timeFromMinutes(req);
  $('todayActualLeave').textContent = entry.actualLeave || '—';

  const pLeave = plannedLeave(entry);
  if (entry.mustBeAt && pLeave != null) {
    $('studyPreviewTitle').textContent = entry.destination || `Нужно быть к ${entry.mustBeAt}`;
    $('studyPreviewText').textContent = `Быть к ${entry.mustBeAt} · дорога ${entry.commuteMinutes ?? state.settings.defaultCommute} мин · уйти с работы не позже ${timeFromMinutes(pLeave)}`;
  } else {
    $('studyPreviewTitle').textContent = 'Планов пока нет';
    $('studyPreviewText').textContent = 'Если добавишь время пары или встречи, приложение посчитает, когда нужно уйти';
  }

  const smart = $('smartTip');
  smart.hidden = true;
  if (entry.arrival && !entry.actualLeave && requiredMinutesForDate(today)) {
    const balanceBeforeToday = periodBalance(currentPeriod, key);
    const normal = requiredLeave(today, entry.arrival);
    const zeroBalanceLeave = normal - balanceBeforeToday;
    let text = balanceBeforeToday === 0
      ? `Чтобы закончить день без долга, уходи в ${timeFromMinutes(normal)}`
      : balanceBeforeToday > 0
        ? `У тебя накоплено ${formatDuration(balanceBeforeToday)}. Для общего баланса 0 сегодня можно уйти в ${timeFromMinutes(zeroBalanceLeave)}`
        : `Сейчас долг ${formatDuration(balanceBeforeToday)}. Чтобы закрыть его сегодня, нужно уйти в ${timeFromMinutes(zeroBalanceLeave)}`;

    if (pLeave != null) {
      const forecast = pLeave - zeroBalanceLeave;
      text += forecast >= 0
        ? ` · план на ${timeFromMinutes(pLeave)} укладывается в баланс`
        : ` · если уйти в ${timeFromMinutes(pLeave)}, баланс изменится ещё на ${formatSigned(forecast)}`;
    }
    smart.textContent = text;
    smart.hidden = false;
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

  const list = $('scheduleList');
  list.innerHTML = '';
  const todayKey = isoDate(new Date());

  for (const date of datesBetween(shownPeriodStart, end)) {
    const key = isoDate(date);
    const entry = state.entries[key];
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (weekend && !entry) continue;

    const delta = entryDelta(date, entry);
    const req = requiredLeave(date, entry?.arrival);
    const pLeave = plannedLeave(entry);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `day-card${weekend ? ' weekend' : ''}${key === todayKey ? ' today' : ''}`;
    card.style.textAlign = 'left';
    card.style.width = '100%';
    card.style.color = 'inherit';
    card.style.cursor = 'pointer';

    const deltaClass = delta == null ? '' : delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    card.innerHTML = `
      <div class="day-card-head">
        <div class="day-date"><strong>${formatDateShort(date)}</strong><span>${WEEKDAYS_SHORT[date.getDay()]}</span></div>
        <span class="delta ${deltaClass}">${delta == null ? '—' : formatSigned(delta)}</span>
      </div>
      ${entry ? `
        <div class="day-times">
          <div><span>Приход</span><strong>${entry.arrival || '—'}</strong></div>
          <div><span>Норма</span><strong>${req == null ? '—' : timeFromMinutes(req)}</strong></div>
          <div><span>План</span><strong>${pLeave == null ? '—' : timeFromMinutes(pLeave)}</strong></div>
          <div><span>Уход</span><strong>${entry.actualLeave || '—'}</strong></div>
        </div>
        ${entry.mustBeAt ? `<div class="day-plan">${escapeHtml(entry.destination || 'После работы')} · быть к ${entry.mustBeAt}${pLeave != null ? ` · уйти до ${timeFromMinutes(pLeave)}` : ''}</div>` : ''}
      ` : `<div class="empty-day">Нажми, чтобы заполнить день</div>`}
    `;
    card.addEventListener('click', () => openEntryDialog(key));
    list.appendChild(card);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderPlans() {
  const start = weekStart();
  const end = addDays(start, 6);
  const weekKey = isoDate(start);
  $('weekRange').textContent = `${formatDateLong(start)} — ${formatDateLong(end)}`;
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
    root.innerHTML = `<section class="plan-day"><h3>Пока пусто</h3><div class="plan-empty">Добавь повторяющиеся дела по дням недели. Галочки будут начинаться заново каждую неделю.</div></section>`;
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
  $('entryDate').value = key;
  $('entryDialogTitle').textContent = `${formatDateLong(date)}, ${WEEKDAYS_SHORT[date.getDay()]}`;
  $('arrivalInput').value = entry.arrival || '';
  $('actualLeaveInput').value = entry.actualLeave || '';
  $('mustBeAtInput').value = entry.mustBeAt || '';
  $('commuteInput').value = entry.commuteMinutes ?? state.settings.defaultCommute;
  $('destinationInput').value = entry.destination || '';
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
  $('settingsDialog').showModal();
}

function exportBackup() {
  const payload = {
    app: 'Мой график',
    version: 1,
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
        planTemplates: data.planTemplates || [],
        planCompletions: data.planCompletions || {}
      };
      saveState();
      shownPeriodStart = getPeriodStart(new Date());
      renderAll();
      showToast('Данные восстановлены');
    } catch {
      showToast('Не удалось прочитать копию');
    }
  };
  reader.readAsText(file);
}

function initEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === tab.dataset.target));
      const titles = { home: 'Сегодня', schedule: 'График', plans: 'Планы' };
      $('screenTitle').textContent = titles[tab.dataset.target];
    });
  });

  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', () => $('settingsDialog').close());
  $('closeEntryBtn').addEventListener('click', () => $('entryDialog').close());
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

/* Shared validation for local data, migration and imported backups. No dependencies. */
(function (root) {
  'use strict';
  const defaults = { regularMinutes: 540, fridayMinutes: 465, earliest: '07:00', latest: '21:00', periodStartDay: 20, defaultCommute: 50, defaultPlannedArrival: '07:30' };
  const fail = (field) => { throw new Error(`Некорректное поле: ${field}`); };
  function object(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field);
    for (const key of Object.keys(value)) if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(field);
    return value;
  }
  function integer(value, min, max, field) {
    if (!Number.isInteger(value) || value < min || value > max) fail(field);
    return value;
  }
  function string(value, max, field) {
    if (typeof value !== 'string' || value.length > max) fail(field);
    return value;
  }
  function time(value, field, empty = true) {
    if (empty && value === '') return '';
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail(field);
    return value;
  }
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('дата');
    const d = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > '2200-12-31') fail('дата');
    return value;
  }
  function norm(key, settings) {
    const day = new Date(key + 'T12:00:00Z').getUTCDay();
    return day === 0 || day === 6 ? 0 : day === 5 ? settings.fridayMinutes : settings.regularMinutes;
  }
  function mapDates(value, name, fn) {
    const result = {};
    const items = Object.entries(object(value ?? {}, name));
    if (items.length > 40000) fail(name);
    for (const [key, item] of items) result[date(key)] = fn(object(item, name), key);
    return result;
  }
  function normalize(input) {
    object(input, 'данные');
    if (input.schemaVersion !== undefined && input.schemaVersion !== 3) fail('версия данных');
    const raw = object(input.settings, 'настройки');
    const settings = { ...defaults };
    for (const [k, min, max] of [['regularMinutes',0,1439],['fridayMinutes',0,1439],['periodStartDay',1,28],['defaultCommute',0,240]]) {
      if (raw[k] !== undefined) settings[k] = integer(raw[k], min, max, k);
    }
    for (const k of ['earliest','latest','defaultPlannedArrival']) if (raw[k] !== undefined) settings[k] = time(raw[k], k, false);
    if (settings.earliest >= settings.latest) fail('границы рабочего дня');
    const entries = mapDates(input.entries, 'записи', (e, key) => {
      const result = {};
      for (const k of ['arrival','actualLeave','mustBeAt']) result[k] = time(e[k] ?? '', k);
      if (result.arrival && result.actualLeave && result.actualLeave < result.arrival) fail('уход раньше прихода');
      result.commuteMinutes = integer(e.commuteMinutes ?? settings.defaultCommute, 0, 240, 'дорога');
      result.destination = string(e.destination ?? '', 80, 'место');
      result.note = string(e.note ?? '', 180, 'заметка');
      result.requiredMinutes = integer(e.requiredMinutes ?? norm(key, settings), 0, 1439, 'норма дня');
      result.breakMinutes = integer(e.breakMinutes ?? 0, 0, 480, 'перерыв');
      if (result.arrival && result.actualLeave) {
        const mins = t => Number(t.slice(0,2))*60 + Number(t.slice(3));
        if (result.breakMinutes > mins(result.actualLeave) - mins(result.arrival)) fail('перерыв длиннее смены');
      }
      return result;
    });
    const weekPlans = mapDates(input.weekPlans, 'план недели', p => ({
      plannedArrival: time(p.plannedArrival ?? '', 'плановый приход'),
      mustBeAt: time(p.mustBeAt ?? '', 'время события'),
      commuteMinutes: integer(p.commuteMinutes ?? settings.defaultCommute, 0, 240, 'дорога'),
      destination: string(p.destination ?? '', 80, 'место')
    }));
    const templates = input.planTemplates ?? [];
    if (!Array.isArray(templates) || templates.length > 2000) fail('список дел');
    const ids = new Set();
    const planTemplates = templates.map(t => {
      object(t, 'дело');
      const id = string(t.id, 100, 'идентификатор дела');
      if (!/^[\w-]+$/.test(id) || ['__proto__','constructor','prototype'].includes(id) || ids.has(id)) fail('идентификатор дела');
      ids.add(id);
      return { id, day: integer(t.day,0,6,'день недели'), text: string(t.text,100,'текст дела') };
    });
    const planCompletions = mapDates(input.planCompletions, 'отметки дел', c => {
      const result = {};
      for (const [id, done] of Object.entries(c)) {
        if (typeof done !== 'boolean') fail('отметка дела');
        if (ids.has(id)) result[id] = done;
      }
      return result;
    });
    return { schemaVersion: 3, settings, entries, weekPlans, planTemplates, planCompletions };
  }
  function parseBackup(text) {
    if (text.length > 8 * 1024 * 1024) fail('размер файла (до 8 МБ)');
    const parsed = object(JSON.parse(text), 'копия');
    if (parsed.data !== undefined) {
      if (parsed.app !== 'Мой график' || ![1,2,3].includes(parsed.version)) fail('формат или версия копии');
      return normalize(parsed.data);
    }
    return normalize(parsed);
  }
  // Existing records win conflicts. Import can safely fill gaps without discarding current data.
  function merge(current, imported) {
    const tasks = new Map(imported.planTemplates.map(t => [t.id,t]));
    current.planTemplates.forEach(t => tasks.set(t.id,t));
    const completions = structuredClone(imported.planCompletions);
    for (const [week, marks] of Object.entries(current.planCompletions)) completions[week] = {...completions[week], ...marks};
    return normalize({...current, entries:{...imported.entries,...current.entries}, weekPlans:{...imported.weekPlans,...current.weekPlans}, planTemplates:[...tasks.values()], planCompletions:completions});
  }
  const api = { normalize, parseBackup, merge, defaults, norm };
  root.ScheduleData = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);

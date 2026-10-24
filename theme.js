/* Runs before CSS so a saved dark appearance is applied before the first paint.
   Appearance is a device preference, independent of schedule data and backups. */
(function () {
  'use strict';
  const key = 'my-work-schedule-theme';
  const options = ['system', 'light', 'dark'];
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const stored = localStorage.getItem(key);
    if (options.includes(stored)) preference = stored;
  } catch { /* Keep the app usable when preference storage is unavailable. */ }

  function apply() {
    const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#111a18' : '#F6F6F2');
    window.dispatchEvent(new Event('appearancechange'));
  }
  window.ScheduleTheme = {
    get preference() { return preference; },
    set(value) {
      if (!options.includes(value)) return false;
      preference = value;
      apply();
      try { localStorage.setItem(key, value); return true; }
      catch { return false; }
    }
  };
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = options.includes(event.newValue) ? event.newValue : 'system';
    apply();
  });
  apply();
})();

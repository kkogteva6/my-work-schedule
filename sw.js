:root {
  --bg: #f5f3ee;
  --surface: #fffefa;
  --surface-2: #ece9e0;
  --text: #252820;
  --muted: #6f746a;
  --green: #597361;
  --green-dark: #3f5c49;
  --amber: #d9a441;
  --red: #b85f56;
  --line: rgba(37, 40, 32, .10);
  --shadow: 0 10px 28px rgba(54, 56, 47, .08);
  --radius-lg: 24px;
  --radius-md: 18px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
button, input, textarea, select { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }

.app-shell { min-height: 100dvh; max-width: 760px; margin: 0 auto; padding-bottom: calc(92px + var(--safe-bottom)); }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: max(22px, env(safe-area-inset-top)) 20px 14px;
  position: sticky; top: 0; z-index: 10;
  background: color-mix(in srgb, var(--bg) 90%, transparent);
  backdrop-filter: blur(18px);
}
.topbar h1 { margin: 2px 0 0; font-size: 30px; line-height: 1.05; letter-spacing: -.6px; }
.eyebrow, .label { color: var(--muted); font-size: 13px; font-weight: 700; letter-spacing: .02em; }

main { padding: 0 16px; }
.screen { display: none; animation: fade .18s ease; }
.screen.active { display: block; }
@keyframes fade { from { opacity: .6; transform: translateY(4px); } to { opacity: 1; transform: none; } }

.hero-card {
  border-radius: 30px; padding: 26px; min-height: 230px;
  background: linear-gradient(145deg, #657d6a, #4e6757);
  color: white; box-shadow: var(--shadow); position: relative; overflow: hidden;
}
.hero-card::after { content: ""; position: absolute; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,.08); right: -40px; top: -50px; }
.hero-day { font-size: 31px; font-weight: 800; letter-spacing: -.7px; }
.hero-quote { max-width: 420px; margin: 12px 0 32px; font-size: 18px; line-height: 1.35; color: rgba(255,255,255,.90); }
.hero-time { font-size: 42px; font-weight: 800; letter-spacing: -1px; }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 14px 0; }
.summary-card, .today-card, .plans-intro, .balance-banner {
  background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow); border-radius: var(--radius-lg);
}
.summary-card { padding: 18px; min-height: 126px; display: flex; flex-direction: column; justify-content: space-between; }
.summary-card strong { font-size: 26px; letter-spacing: -.5px; }
.summary-card small { color: var(--muted); line-height: 1.3; }

.today-card { padding: 20px; margin: 14px 0; }
.today-card.compact { padding-bottom: 18px; }
.section-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
.section-heading h2, .plans-intro h2 { margin: 3px 0 0; font-size: 21px; letter-spacing: -.3px; }
.today-times { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px 0; }
.today-times div { background: var(--surface-2); border-radius: 16px; padding: 13px 10px; text-align: center; }
.today-times span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 5px; }
.today-times strong { font-size: 20px; }
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.smart-tip { background: #f0eadc; border: 1px solid rgba(217,164,65,.3); border-radius: 16px; padding: 13px 14px; line-height: 1.35; }
.muted { color: var(--muted); line-height: 1.45; }
.small-text { font-size: 14px; }

.primary-button, .secondary-button, .danger-ghost, .text-button, .icon-button, .period-button, .tab {
  border: 0; cursor: pointer; min-height: 48px; border-radius: 15px; font-weight: 750;
}
.primary-button { background: var(--green); color: white; padding: 0 17px; }
.primary-button:active { background: var(--green-dark); transform: scale(.99); }
.secondary-button { background: var(--surface-2); color: var(--text); padding: 0 17px; }
.danger-ghost { background: transparent; color: var(--red); padding: 0 12px; }
.text-button { background: transparent; color: var(--green-dark); min-height: 38px; padding: 0 4px; }
.icon-button { width: 48px; background: var(--surface); color: var(--text); font-size: 25px; border: 1px solid var(--line); }
.icon-button.small { width: 42px; min-height: 42px; font-size: 30px; }
.full { width: 100%; }
.small-btn { min-height: 42px; }

.tabbar {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 20;
  width: min(100%, 760px); display: grid; grid-template-columns: repeat(3, 1fr);
  padding: 8px 12px calc(8px + var(--safe-bottom));
  background: rgba(255,254,250,.93); backdrop-filter: blur(20px); border-top: 1px solid var(--line);
}
.tab { background: transparent; color: var(--muted); min-height: 58px; display: grid; place-items: center; gap: 1px; font-size: 12px; }
.tab-icon { font-size: 23px; line-height: 1; }
.tab.active { color: var(--green-dark); background: #eef1eb; }

.period-toolbar { display: grid; grid-template-columns: 44px 1fr 44px; gap: 8px; align-items: center; margin: 4px 0 12px; }
.period-button { background: transparent; color: var(--text); text-align: center; padding: 4px 6px; }
.period-button strong { display: block; font-size: 18px; }
.period-button small { color: var(--muted); }
.balance-banner { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; margin-bottom: 12px; }
.balance-banner strong { font-size: 25px; }

.schedule-list { display: grid; gap: 10px; }
.day-card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 16px; box-shadow: 0 5px 18px rgba(54,56,47,.05); }
.day-card.weekend { opacity: .67; }
.day-card.today { outline: 2px solid rgba(89,115,97,.22); }
.day-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.day-date { display: flex; align-items: baseline; gap: 7px; }
.day-date strong { font-size: 18px; }
.day-date span { color: var(--muted); font-size: 14px; }
.delta { padding: 5px 9px; border-radius: 999px; font-weight: 800; font-size: 13px; background: var(--surface-2); }
.delta.positive { color: var(--green-dark); background: #e9f0e9; }
.delta.negative { color: #954b44; background: #f7eae8; }
.day-times { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 13px; }
.day-times div { min-width: 0; }
.day-times span { display: block; color: var(--muted); font-size: 11px; margin-bottom: 3px; }
.day-times strong { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.day-plan { margin-top: 11px; background: #f3efe4; border-radius: 13px; padding: 10px 12px; color: #5b5547; font-size: 13px; line-height: 1.35; }
.empty-day { color: var(--muted); font-size: 14px; margin-top: 10px; }

.plans-intro { display: flex; justify-content: space-between; align-items: center; padding: 18px; margin-bottom: 12px; }
.plans-list { display: grid; gap: 12px; }
.plan-day { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 16px; }
.plan-day h3 { margin: 0 0 11px; font-size: 17px; }
.plan-item { display: grid; grid-template-columns: 28px 1fr 34px; gap: 8px; align-items: center; min-height: 44px; border-top: 1px solid var(--line); }
.plan-item:first-of-type { border-top: 0; }
.plan-item input[type="checkbox"] { width: 21px; height: 21px; accent-color: var(--green); }
.plan-item.done span { color: var(--muted); text-decoration: line-through; }
.plan-delete { border: 0; background: transparent; color: var(--muted); font-size: 20px; min-height: 36px; }
.plan-empty { color: var(--muted); font-size: 14px; }

.sheet-dialog { border: 0; padding: 0; margin: auto 0 0; width: 100%; max-width: none; background: transparent; }
.sheet-dialog::backdrop { background: rgba(20,22,18,.33); backdrop-filter: blur(3px); }
.sheet-content { margin: 0 auto; width: min(100%, 760px); max-height: 92dvh; overflow: auto; background: var(--surface); border-radius: 28px 28px 0 0; padding: 10px 18px calc(24px + var(--safe-bottom)); }
.compact-sheet { max-height: 70dvh; }
.sheet-handle { width: 42px; height: 5px; background: #d5d2c9; border-radius: 99px; margin: 2px auto 15px; }
.sheet-header { display: flex; justify-content: space-between; gap: 15px; align-items: start; margin-bottom: 18px; }
.sheet-header h2 { margin: 3px 0 0; font-size: 24px; }
.form-grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 7px; margin-bottom: 12px; color: var(--muted); font-size: 13px; font-weight: 700; }
.field input, .field textarea, .field select {
  width: 100%; min-height: 50px; border: 1px solid var(--line); background: #f8f7f2; color: var(--text); border-radius: 14px; padding: 11px 13px; outline: none; font-size: 16px;
}
.field textarea { resize: vertical; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: rgba(89,115,97,.55); box-shadow: 0 0 0 3px rgba(89,115,97,.10); }
.calculated-field { background: #eef1eb; border-radius: 14px; padding: 10px 13px; min-height: 74px; display: flex; flex-direction: column; justify-content: center; }
.calculated-field span { color: var(--muted); font-size: 13px; font-weight: 700; }
.calculated-field strong { font-size: 20px; margin-top: 5px; }
.calculated-strip { background: #f3efe4; border-radius: 14px; padding: 12px 13px; margin: -2px 0 13px; font-weight: 750; }
.divider { height: 1px; background: var(--line); margin: 8px 0 16px; }
.form-section-title { font-size: 15px; font-weight: 800; margin-bottom: 12px; }
.dialog-actions { display: grid; grid-template-columns: auto 1fr; gap: 10px; margin-top: 4px; }
.validation-message { color: #8b453f; background: #f8ecea; border-radius: 13px; padding: 11px 12px; font-size: 14px; margin-bottom: 10px; }
.backup-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0 16px; }
.file-button { display: flex; align-items: center; justify-content: center; }

.toast { position: fixed; left: 50%; bottom: calc(92px + var(--safe-bottom)); transform: translate(-50%, 14px); background: #242720; color: white; padding: 10px 14px; border-radius: 13px; opacity: 0; pointer-events: none; transition: .2s; z-index: 50; max-width: calc(100% - 32px); text-align: center; font-size: 14px; }
.toast.show { opacity: 1; transform: translate(-50%, 0); }

.positive-text { color: var(--green-dark) !important; }
.negative-text { color: #954b44 !important; }

@media (max-width: 420px) {
  .hero-card { min-height: 215px; padding: 22px; }
  .hero-day { font-size: 28px; }
  .hero-time { font-size: 38px; }
  .summary-card { padding: 15px; min-height: 118px; }
  .summary-card strong { font-size: 23px; }
  .day-times { grid-template-columns: repeat(2, 1fr); gap: 9px 6px; }
}

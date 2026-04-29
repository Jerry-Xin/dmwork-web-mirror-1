const TAG = "🔗 CoCraft";

const STYLES = {
  title:  "background:#7c3aed;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
  step:   "background:#2563eb;color:#fff;padding:1px 5px;border-radius:3px",
  ok:     "background:#16a34a;color:#fff;padding:1px 5px;border-radius:3px",
  warn:   "background:#d97706;color:#fff;padding:1px 5px;border-radius:3px",
  err:    "background:#dc2626;color:#fff;padding:1px 5px;border-radius:3px",
  data:   "color:#8b5cf6",
  dim:    "color:#6b7280",
  reset:  "",
};

type Ctx = "sidepanel" | "background" | "offscreen" | "tab";

const CTX_STYLES: Record<Ctx, string> = {
  sidepanel:  "background:#0ea5e9;color:#fff;padding:1px 5px;border-radius:3px",
  background: "background:#f59e0b;color:#000;padding:1px 5px;border-radius:3px",
  offscreen:  "background:#6366f1;color:#fff;padding:1px 5px;border-radius:3px",
  tab:        "background:#10b981;color:#fff;padding:1px 5px;border-radius:3px",
};

function stepLog(ctx: Ctx, step: string, msg: string, data?: any) {
  const parts = [
    `%c${TAG}%c %c${ctx}%c %c${step}%c ${msg}`,
    STYLES.title, STYLES.reset,
    CTX_STYLES[ctx], STYLES.reset,
    STYLES.step, STYLES.reset,
  ];
  if (data !== undefined) {
    console.log(...parts, "\n", data);
  } else {
    console.log(...parts);
  }
}

function okLog(ctx: Ctx, step: string, msg: string, data?: any) {
  const parts = [
    `%c${TAG}%c %c${ctx}%c %c${step}%c ✅ ${msg}`,
    STYLES.title, STYLES.reset,
    CTX_STYLES[ctx], STYLES.reset,
    STYLES.ok, STYLES.reset,
  ];
  if (data !== undefined) {
    console.log(...parts, "\n", data);
  } else {
    console.log(...parts);
  }
}

function warnLog(ctx: Ctx, step: string, msg: string, data?: any) {
  const parts = [
    `%c${TAG}%c %c${ctx}%c %c${step}%c ⚠️ ${msg}`,
    STYLES.title, STYLES.reset,
    CTX_STYLES[ctx], STYLES.reset,
    STYLES.warn, STYLES.reset,
  ];
  if (data !== undefined) {
    console.warn(...parts, "\n", data);
  } else {
    console.warn(...parts);
  }
}

function errLog(ctx: Ctx, step: string, msg: string, data?: any) {
  const parts = [
    `%c${TAG}%c %c${ctx}%c %c${step}%c ❌ ${msg}`,
    STYLES.title, STYLES.reset,
    CTX_STYLES[ctx], STYLES.reset,
    STYLES.err, STYLES.reset,
  ];
  if (data !== undefined) {
    console.error(...parts, "\n", data);
  } else {
    console.error(...parts);
  }
}

function divider(ctx: Ctx, label: string) {
  console.log(
    `%c${TAG}%c %c${ctx}%c ────────── ${label} ──────────`,
    STYLES.title, STYLES.reset,
    CTX_STYLES[ctx], STYLES.reset,
  );
}

export const cocraftLog = { step: stepLog, ok: okLog, warn: warnLog, err: errLog, divider };

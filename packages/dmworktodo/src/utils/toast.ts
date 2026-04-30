/**
 * Minimal toast utility for @dmwork/todo.
 * Uses a self-removing DOM element — no external dependency.
 */

const TOAST_DURATION = 3000;

function createToastContainer(): HTMLDivElement {
  let container = document.getElementById('wk-todo-toast-container') as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = 'wk-todo-toast-container';
    Object.assign(container.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '10000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = createToastContainer();
  const el = document.createElement('div');

  const colors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    info: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
  };
  const c = colors[type];

  Object.assign(el.style, {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: c.text,
    background: c.bg,
    border: `1px solid ${c.border}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    pointerEvents: 'auto',
    opacity: '0',
    transition: 'opacity 200ms ease',
  });
  el.textContent = message;

  container.appendChild(el);
  // Trigger fade-in
  requestAnimationFrame(() => { el.style.opacity = '1'; });

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.remove();
      // Clean up container if empty
      if (container.childElementCount === 0) {
        container.remove();
      }
    }, 200);
  }, TOAST_DURATION);
}

export const Toast = {
  success: (msg: string) => showToast(msg, 'success'),
  error: (msg: string) => showToast(msg, 'error'),
  info: (msg: string) => showToast(msg, 'info'),
};

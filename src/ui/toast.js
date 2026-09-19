/**
 * toast.js — User-facing notifications.
 */

const container = document.getElementById('toastContainer');

/**
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 * @param {number} [duration=3500]
 */
export function showToast(message, type = 'info', duration = 3500) {
  const el = document.createElement('div');
  el.className = `toast${type !== 'info' ? ` ${type}` : ''}`;
  el.textContent = message;
  container.appendChild(el);

  const dismiss = () => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);
  el.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}

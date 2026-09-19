/**
 * sidebar.js — Desktop sidebar and mobile bottom sheet toggle.
 */

export function setupSidebar() {
  const mobileToggle  = document.getElementById('mobileToggle');
  const mobileSheet   = document.getElementById('mobileSheet');
  const mobileOverlay = document.getElementById('mobileOverlay');

  function openSheet() {
    mobileSheet.classList.remove('hidden');
    mobileOverlay.classList.remove('hidden');
    // Force reflow so the transition fires
    mobileSheet.getBoundingClientRect();
    mobileSheet.classList.add('open');
  }

  function closeSheet() {
    mobileSheet.classList.remove('open');
    mobileSheet.addEventListener('transitionend', () => {
      mobileSheet.classList.add('hidden');
      mobileOverlay.classList.add('hidden');
    }, { once: true });
  }

  mobileToggle?.addEventListener('click', openSheet);
  mobileOverlay?.addEventListener('click', closeSheet);

  // Swipe down to close
  let touchStartY = 0;
  mobileSheet?.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  mobileSheet?.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 60) closeSheet();
  }, { passive: true });
}

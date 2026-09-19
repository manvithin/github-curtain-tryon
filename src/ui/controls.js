/**
 * controls.js — Wires all sidebar/panel UI controls to the curtain controller.
 */

import { store } from '../state.js';
import {
  openCurtain,
  closeCurtain,
  setCurtainOpen,
  resetPosition,
  resetAll,
  setWidth,
  setHeight,
  setRotation,
} from '../curtain/controller.js';

export function setupControls() {
  // ── Open / Close buttons ─────────────────────────────────────────────
  qs('#openBtn')?.addEventListener('click',  openCurtain);
  qs('#closeBtn')?.addEventListener('click', closeCurtain);

  // ── Open amount slider ────────────────────────────────────────────────
  const openSlider = qs('#openSlider');
  const openVal    = qs('#openVal');
  openSlider?.addEventListener('input', () => {
    const v = Number(openSlider.value);
    if (openVal) openVal.textContent = `${v}%`;
    setCurtainOpen(v);
  });

  // ── Width slider ───────────────────────────────────────────────────────
  const widthSlider = qs('#widthSlider');
  const widthVal    = qs('#widthVal');
  widthSlider?.addEventListener('input', () => {
    const v = Number(widthSlider.value);
    if (widthVal) widthVal.textContent = `${v}%`;
    setWidth(v);
  });

  // ── Height slider ──────────────────────────────────────────────────────
  const heightSlider = qs('#heightSlider');
  const heightVal    = qs('#heightVal');
  heightSlider?.addEventListener('input', () => {
    const v = Number(heightSlider.value);
    if (heightVal) heightVal.textContent = `${v}%`;
    setHeight(v);
  });

  // ── Rotation slider ────────────────────────────────────────────────────
  const rotateSlider = qs('#rotateSlider');
  const rotateVal    = qs('#rotateVal');
  rotateSlider?.addEventListener('input', () => {
    const v = Number(rotateSlider.value);
    if (rotateVal) rotateVal.textContent = `${v}°`;
    setRotation(v);
  });

  // ── Reset buttons ──────────────────────────────────────────────────────
  qs('#resetPositionBtn')?.addEventListener('click', () => {
    resetPosition();
    // Sync sliders back to defaults
    if (widthSlider)  { widthSlider.value  = 100; if (widthVal) widthVal.textContent = '100%'; }
    if (heightSlider) { heightSlider.value = 100; if (heightVal) heightVal.textContent = '100%'; }
  });

  qs('#resetCurtainBtn')?.addEventListener('click', () => {
    resetAll();
    if (widthSlider)   { widthSlider.value  = 100; if (widthVal) widthVal.textContent = '100%'; }
    if (heightSlider)  { heightSlider.value = 100; if (heightVal) heightVal.textContent = '100%'; }
    if (rotateSlider)  { rotateSlider.value = 0;   if (rotateVal) rotateVal.textContent = '0°'; }
    if (openSlider)    { openSlider.value   = 0;   if (openVal) openVal.textContent = '0%'; }
    setCurtainOpen(0);
  });

  // ── Show/hide curtain controls when model loads ────────────────────────
  store.subscribe((state) => {
    const curtainControls = qs('#curtainControls');
    const noModelNotice   = qs('#noModelNotice');
    if (curtainControls && noModelNotice) {
      if (state.modelLoaded) {
        curtainControls.classList.remove('hidden');
        noModelNotice.classList.add('hidden');
      } else if (state.modelError) {
        noModelNotice.querySelector('p').textContent =
          '⚠ Failed to load curtain.glb. ' + (state.modelError || '');
      }
    }
  });
}

function qs(sel) { return document.querySelector(sel); }

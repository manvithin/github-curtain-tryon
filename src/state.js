/**
 * state.js — Tiny reactive state store.
 *
 * Usage:
 *   import { store } from './state.js';
 *   store.set({ curtainOpen: true });
 *   store.get().curtainOpen  // → true
 *   const unsub = store.subscribe(state => ...);
 *   unsub(); // unsubscribe
 */

const initialState = {
  // Photo
  photoUrl: null,
  hasPhoto: false,

  // Model
  modelLoaded: false,
  modelLoading: false,
  modelError: null,

  // Meshes
  frontMeshes: [],
  backMeshes: [],

  // Fabric
  frontFabricUrl: null,
  backFabricUrl: null,

  // Curtain animation
  curtainOpen: false,
  openAmount: 0, // 0-100

  // Transform (in canvas %-space for DOM overlay; also maps to 3D group)
  position: { x: 0, y: 0 },
  scale:    { x: 1, y: 1 },
  rotation: 0, // degrees

  // UI
  sidebarOpen: false, // mobile
};

function createStore(init) {
  let state = { ...init };
  const listeners = new Set();

  return {
    get() {
      return state;
    },
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      listeners.forEach(fn => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const store = createStore(initialState);

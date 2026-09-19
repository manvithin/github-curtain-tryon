import { create } from 'zustand';
import { CURTAIN_CONFIG } from '../config/curtainConfig.js';

const STORAGE_KEY = 'curtain_visualizer_project_v1';

// Initial default state
const initialTransform = {
  positionX: 0,
  positionY: 0,
  width: CURTAIN_CONFIG.defaultWidth,
  height: CURTAIN_CONFIG.defaultHeight,
  rotation: 0
};

export const useVisualizerStore = create((set, get) => ({
  // Screen step: 'upload' | 'visualizer'
  step: 'upload',

  // Room background photo { id, url, width, height, isSample }
  backgroundImage: null,

  // Selected fabric { id, name, imageUrl, repeatX, repeatY, category, isCustom }
  selectedFabric: null,
  fabrics: [],
  isLoadingFabrics: false,

  // Curtain 3D transform & dimension
  curtain: { ...initialTransform },

  // Open/Close animation state
  // openProgress: 0 (closed) -> 1 (open)
  animationState: {
    isOpen: false,
    openProgress: 0,
    isAnimating: false
  },

  // Active UI tab in controls bottom sheet / sidebar
  // 'fabric' | 'size' | 'position' | 'animation'
  activeTab: 'fabric',

  // Bottom sheet collapsed state (for mobile viewport clearing)
  isSheetCollapsed: false,

  // Background image pan / zoom offset (CSS %)
  bgOffset: { x: 0, y: 0, scale: 1 },

  // Global loading overlay & toast
  isLoading: false,
  loadingMessage: '',
  toast: null, // { message, type: 'info' | 'success' | 'error', id }

  // Screenshot / Export preview modal
  isExportModalOpen: false,
  exportImageUrl: null,

  // ── Actions ─────────────────────────────────────────────────────────────

  setStep: (step) => set({ step }),

  setBackgroundImage: (image) => {
    set({
      backgroundImage: image,
      step: 'visualizer'
    });
    get().saveToLocalStorage();
  },

  setFabrics: (fabrics) => set({ fabrics }),

  setSelectedFabric: (fabric) => {
    set({ selectedFabric: fabric });
    get().saveToLocalStorage();
  },

  setCurtainTransform: (partial) => {
    set((state) => ({
      curtain: { ...state.curtain, ...partial }
    }));
    get().saveToLocalStorage();
  },

  resetCurtainTransform: () => {
    set({ curtain: { ...initialTransform } });
    get().saveToLocalStorage();
  },

  setAnimationState: (partial) => {
    set((state) => ({
      animationState: { ...state.animationState, ...partial }
    }));
  },

  setActiveTab: (tab) => set({ activeTab: tab, isSheetCollapsed: false }),

  toggleSheetCollapsed: () => set((state) => ({ isSheetCollapsed: !state.isSheetCollapsed })),

  setBgOffset: (partial) =>
    set((state) => ({ bgOffset: { ...state.bgOffset, ...partial } })),

  setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),

  showToast: (message, type = 'info', duration = 3500) => {
    const id = Date.now();
    set({ toast: { message, type, id } });
    setTimeout(() => {
      const current = get().toast;
      if (current && current.id === id) {
        set({ toast: null });
      }
    }, duration);
  },

  hideToast: () => set({ toast: null }),

  setExportModal: (isOpen, exportImageUrl = null) => set({ isExportModalOpen: isOpen, exportImageUrl }),

  // Local persistence
  saveToLocalStorage: () => {
    try {
      const state = get();
      const payload = {
        backgroundImage: state.backgroundImage,
        selectedFabric: state.selectedFabric,
        curtain: state.curtain
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.backgroundImage) {
          set({
            backgroundImage: parsed.backgroundImage,
            selectedFabric: parsed.selectedFabric || null,
            curtain: { ...initialTransform, ...(parsed.curtain || {}) },
            step: 'visualizer'
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
  },

  clearProject: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    set({
      step: 'upload',
      backgroundImage: null,
      curtain: { ...initialTransform },
      animationState: { isOpen: false, openProgress: 0, isAnimating: false }
    });
  }
}));

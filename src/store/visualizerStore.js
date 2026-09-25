import { create } from 'zustand';
import { CURTAIN_CONFIG, BUILTIN_FABRICS, SHEER_PRESETS } from '../config/curtainConfig.js';

const STORAGE_KEY = 'curtain_visualizer_project_v2';

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

  // Active curtain model: 'single' | 'double'
  selectedModel: 'single',

  // Active gesture target layer: 'curtain' | 'photo'
  selectedLayer: 'curtain',

  // Active gesture drag state (for disabling backdrop-filter during 60fps gestures)
  isTransforming: false,

  // Room background photo { id, url, width, height, isSample }
  backgroundImage: null,

  // Selected main front fabric { id, name, imageUrl, repeatX, repeatY, category, isCustom }
  selectedFabric: BUILTIN_FABRICS[0] || null,
  fabrics: [],
  isLoadingFabrics: false,

  // Selected rear sheer fabric for double-layer curtain
  selectedSheerFabric: SHEER_PRESETS[0] || null,

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

  setSelectedModel: (selectedModel) => {
    set({ selectedModel });
    get().saveToLocalStorage();
  },

  setSelectedLayer: (selectedLayer) => set({ selectedLayer }),

  setIsTransforming: (isTransforming) => set({ isTransforming }),

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

  setSelectedSheerFabric: (sheerFabric) => {
    set({ selectedSheerFabric: sheerFabric });
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
        selectedModel: state.selectedModel,
        backgroundImage: state.backgroundImage,
        selectedFabric: state.selectedFabric,
        selectedSheerFabric: state.selectedSheerFabric,
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
            selectedModel: parsed.selectedModel || 'single',
            backgroundImage: parsed.backgroundImage,
            selectedFabric: parsed.selectedFabric || BUILTIN_FABRICS[0],
            selectedSheerFabric: parsed.selectedSheerFabric || SHEER_PRESETS[0],
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
      selectedModel: 'single',
      backgroundImage: null,
      selectedFabric: BUILTIN_FABRICS[0],
      selectedSheerFabric: SHEER_PRESETS[0],
      curtain: { ...initialTransform },
      animationState: { isOpen: false, openProgress: 0, isAnimating: false }
    });
  }
}));

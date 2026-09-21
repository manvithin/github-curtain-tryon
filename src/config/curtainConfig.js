/**
 * curtainConfig.js — Central configuration for Curtain Visualizer 3D models & rendering.
 */

export const MODEL_CONFIG = {
  single: {
    id: 'single',
    name: 'Single Layer Curtain',
    url: '/models/curtain.glb',
    frontMaterials: ['tissus curtain', 'mat_frontdrape', 'curtain', 'fabric', 'cloth'],
    sheerMaterials: [],
    tiebackMaterials: [],
    rodMaterials: ['ral7016', 'métal gris brillant', 'cylinder'],
    animationClips: ['Plane.045Action', 'Plane.052Action', 'Open', 'Close', 'Action']
  },
  double: {
    id: 'double',
    name: 'Double Layer Curtain',
    url: '/models/Double_Curtain.glb',
    frontMaterials: ['tissus curtain', 'mat_frontdrape', 'curtain', 'fabric', 'cloth'],
    sheerMaterials: ['voilage', 'mat_backsheer', 'sheer', 'net', 'voile'],
    tiebackMaterials: ['tiebacks', 'tieback', 'tissus curtain', 'mat_frontdrape'],
    rodMaterials: ['ral7016', 'glass noise', 'cylinder', 'tringle'],
    animationClips: ['Plane.004Action', 'Plane.005Action', 'Open', 'Close', 'Action']
  }
};

export const CURTAIN_CONFIG = {
  // Default model
  defaultModel: 'single',
  modelUrl: '/models/curtain.glb',

  // Substrings of meshes to hide if unwanted
  excludeMeshes: [
    'holdback', 'hold_back',
    'hookback', 'hook',
    'bracket'
  ],

  // Dimension limits (in meters)
  defaultWidth: 2.2,
  defaultHeight: 2.6,
  minWidth: 0.2,
  maxWidth: 12.0,
  minHeight: 0.3,
  maxHeight: 8.0,

  // Texture tiling defaults
  defaultFabricRepeatX: 1,
  defaultFabricRepeatY: 1,

  // Animation config
  animationNames: {
    clips: ['Plane.045Action', 'Plane.052Action', 'Plane.004Action', 'Plane.005Action', 'Open', 'Close', 'Action'],
    easeDuration: 0.8
  },

  // Lighting parameters
  lighting: {
    ambientIntensity: 0.9,
    directionalIntensity: 1.15,
    directionalPosition: [2, 4, 3],
    fillIntensity: 0.45
  },

  // DPR clamping for mobile performance
  dpr: [1, 2],

  // Camera settings
  camera: {
    fov: 45,
    near: 0.1,
    far: 100,
    defaultZ: 4.5
  }
};

export const BUILTIN_FABRICS = [
  {
    id: 'fabric-linen-natural',
    name: 'Natural Beige Linen',
    imageUrl: '/fabrics/linen_natural.webp',
    thumbnailUrl: '/fabrics/linen_natural.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Linen',
    color: '#D8C7B0',
    isCustom: false,
    isSheer: false
  },
  {
    id: 'fabric-velvet-navy',
    name: 'Royal Navy Velvet',
    imageUrl: '/fabrics/velvet_navy.webp',
    thumbnailUrl: '/fabrics/velvet_navy.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Velvet',
    color: '#1E2D4A',
    isCustom: false,
    isSheer: false
  },
  {
    id: 'fabric-cotton-charcoal',
    name: 'Charcoal Slub Weave',
    imageUrl: '/fabrics/cotton_charcoal.webp',
    thumbnailUrl: '/fabrics/cotton_charcoal.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Cotton',
    color: '#34383C',
    isCustom: false,
    isSheer: false
  },
  {
    id: 'fabric-silk-champagne',
    name: 'Champagne Shimmer Silk',
    imageUrl: '/fabrics/silk_champagne.webp',
    thumbnailUrl: '/fabrics/silk_champagne.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Silk',
    color: '#F4ECE1',
    isCustom: false,
    isSheer: false
  },
  {
    id: 'fabric-sheer-ivory',
    name: 'Ivory Sheer Weave',
    imageUrl: '/fabrics/sheer_ivory.webp',
    thumbnailUrl: '/fabrics/sheer_ivory.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Sheer',
    color: '#F9F8F6',
    isCustom: false,
    isSheer: true
  },
  {
    id: 'fabric-geo-sage',
    name: 'Sage Herringbone Jacquard',
    imageUrl: '/fabrics/geo_sage.webp',
    thumbnailUrl: '/fabrics/geo_sage.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Jacquard',
    color: '#7C8C7E',
    isCustom: false,
    isSheer: false
  }
];

export const SHEER_PRESETS = [
  {
    id: 'sheer-ivory-weave',
    name: 'Ivory Sheer Weave',
    imageUrl: '/fabrics/sheer_ivory.webp',
    thumbnailUrl: '/fabrics/sheer_ivory.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Sheer',
    color: '#F9F8F6',
    isCustom: false,
    isSheer: true
  },
  {
    id: 'sheer-linen-voile',
    name: 'Natural Linen Voile',
    imageUrl: '/fabrics/linen_natural.webp',
    thumbnailUrl: '/fabrics/linen_natural.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Sheer',
    color: '#D8C7B0',
    isCustom: false,
    isSheer: true
  },
  {
    id: 'sheer-silk-mist',
    name: 'Silk Mist Sheer',
    imageUrl: '/fabrics/silk_champagne.webp',
    thumbnailUrl: '/fabrics/silk_champagne.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Sheer',
    color: '#F4ECE1',
    isCustom: false,
    isSheer: true
  }
];

export const DEFAULT_SAMPLE_ROOM = {
  id: 'room-modern-living',
  name: 'Modern Living Room',
  url: '/rooms/modern_living.webp',
  width: 1280,
  height: 960,
  isSample: true
};

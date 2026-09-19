/**
 * curtainConfig.js — Central configuration for Curtain Visualizer 3D model & rendering.
 *
 * To swap the Blender GLB model:
 * 1. Put the new .glb in /public/models/
 * 2. Update modelUrl below.
 * 3. Update targetMaterials / curtainMeshes if the new model uses different names.
 */

export const CURTAIN_CONFIG = {
  // Path to GLB asset (served from public folder)
  modelUrl: '/models/curtain.glb',

  // Target material names where fabric texture will be applied
  // Matches case-insensitively against material names in the GLB
  targetMaterials: ['tissus curtain', 'curtain', 'fabric', 'cloth'],

  // Mesh names / prefixes for the main fabric panels
  curtainMeshes: ['plane.045', 'plane.052', 'plane.001', 'plane.004', 'plane.005', 'rideau'],

  // Substrings of meshes to hide (e.g. tie-backs or brackets that shouldn't display during open/close)
  excludeMeshes: [
    'tieback', 'tie_back', 'tieBack', 'tie-back',
    'holdback', 'hold_back',
    'hookback', 'hook',
    'bracket', 'hardware'
  ],

  // Dimension limits (in meters)
  defaultWidth: 2.2,
  defaultHeight: 2.6,
  minWidth: 0.2,
  maxWidth: 12.0,
  minHeight: 0.3,
  maxHeight: 8.0,

  // Texture tiling
  defaultFabricRepeatX: 1,
  defaultFabricRepeatY: 1,

  // Animation config
  animationNames: {
    // Target clips present in the Blender file (Plane.045Action, Plane.052Action) or generic names
    clips: ['Plane.045Action', 'Plane.052Action', 'Plane.004Action', 'Plane.005Action', 'Open', 'Close', 'Action'],
    easeDuration: 0.8 // seconds
  },

  // Lighting parameters
  lighting: {
    ambientIntensity: 0.85,
    directionalIntensity: 1.1,
    directionalPosition: [2, 4, 3],
    fillIntensity: 0.4
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

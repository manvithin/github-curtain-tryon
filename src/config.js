/**
 * config.js — Central configuration for the Curtain Visualizer.
 * 
 * To swap the GLB model: change MODEL_PATH.
 * To match your model's mesh names: update FRONT_LAYER_NAMES / BACK_LAYER_NAMES.
 */

export const config = {
  // ── Model ──────────────────────────────────────────────────────────────
  MODEL_PATH: '/curtain.glb',

  // Mesh name substrings to identify front / back curtain layers.
  // Case-insensitive. Add your model's actual mesh names here.
  FRONT_LAYER_NAMES: ['front', 'panel_a', 'layer0', 'outer', 'main', 'curtain_front'],
  BACK_LAYER_NAMES:  ['back',  'panel_b', 'layer1', 'inner', 'lining', 'curtain_back'],

  // Meshes whose names contain ANY of these substrings (case-insensitive)
  // will be hidden. Add your model's tie-back / hook / rod-bracket names here.
  EXCLUDE_MESH_NAMES: [
    'tieback', 'tie_back', 'tieBack', 'tie-back',
    'holdback', 'hold_back',
    'hookback', 'hook',
    'bracket', 'ring', 'eyelet',
    'hardware',
  ],

  // If only ONE mesh set is found, assign it to front and clone for back?
  SINGLE_LAYER_FALLBACK: true,

  // ── Rendering ──────────────────────────────────────────────────────────
  MAX_PIXEL_RATIO: 2,            // Cap for devicePixelRatio
  TONE_MAPPING_EXPOSURE: 1.0,    // ACESFilmic exposure
  SHADOW_MAP_SIZE: 1024,         // Shadow map resolution

  // ── Fabric ─────────────────────────────────────────────────────────────
  FABRIC_REPEAT_U: 3,            // UV tiling horizontal
  FABRIC_REPEAT_V: 5,            // UV tiling vertical
  MAX_TEXTURE_SIZE: 2048,        // Max uploaded texture dimension (px)
  MAX_FILE_SIZE_MB: 10,          // Max fabric image file size

  // ── Curtain default transform ───────────────────────────────────────────
  DEFAULT_POSITION: { x: 0, y: 0 },
  DEFAULT_SCALE:    { x: 1, y: 1 },
  DEFAULT_ROTATION: 0,

  // ── Animation ──────────────────────────────────────────────────────────
  ANIMATION_CLIP_INDEX: 0,       // Which GLB animation clip to use
  ANIMATION_EASE_DURATION: 0.8,  // Seconds to ease open/close

  // ── Environment ────────────────────────────────────────────────────────
  ENV_INTENSITY: 0.6,
  AMBIENT_INTENSITY: 0.8,
  DIRECTIONAL_INTENSITY: 1.2,
};

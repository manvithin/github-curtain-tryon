# 🪟 Curtain Studio — Production-Ready Mobile-First Curtain Visualizer

A complete, fully functional, and deployable web application that allows users to photograph or upload a room/window image, overlay an authentic 3D curtain loaded from a Blender GLB model, apply real fabric textures, adjust width & height in meters, drag & position the curtain with 1-finger mobile touch, play embedded open/close Blender animations, and save/export high-resolution composite previews.

---

## 📑 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [Prerequisites & Installation](#-prerequisites--installation)
5. [Running the Application](#-running-the-application)
6. [Blender 3D Model Integration](#-blender-3d-model-integration)
7. [Fabric Pipeline & Custom Uploads](#-fabric-pipeline--custom-uploads)
8. [Configuration Guide (`curtainConfig.js`)](#-configuration-guide)
9. [Backend API Reference](#-backend-api-reference)
10. [Export & Preview Compositing](#-export--preview-compositing)
11. [Production Deployment](#-production-deployment)
12. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏛 Architecture Overview

Curtain Studio strictly decouples presentation, 3D rendering, animation, and backend asset processing:

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Vite + React)                │
│                                                             │
│   Room Background Photo (Preserves Aspect Ratio)            │
│                 │                                           │
│                 ▼                                           │
│   Transparent WebGL Canvas (React Three Fiber + Three.js)   │
│                 │                                           │
│                 ├── 3D Curtain Model (Blender GLB Loader)   │
│                 ├── Fabric Material (PBR Texture Swapper)   │
│                 ├── Transform System (Raycast Dragging)     │
│                 └── Animation Mixer (Embedded Morph Clips)  │
│                 │                                           │
│                 ▼                                           │
│   Mobile Bottom Sheet / Desktop Controls (Zustand Store)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ API Requests (Proxy /api)
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend (Node.js + Express)              │
│                                                             │
│   ├── /api/uploads  (Sharp WebP resizing & compression)     │
│   ├── /api/fabrics  (Catalog management & custom uploads)   │
│   ├── /api/models   (Model configuration & metadata)        │
│   ├── /api/health   (Service health & uptime)               │
│   └── StorageService (Abstract provider: Local / S3 / R2)   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **Mobile-First UX**:
  - Native camera trigger (`capture="environment"`) for immediate room capture on Android & iOS.
  - 1-finger smooth touch dragging across the room image with viewport boundary clamping.
  - Floating, collapsible bottom sheet with $44\text{px}+$ touch targets.
  - Desktop-responsive split layout with side-by-side controls.
- **Authentic 3D Curtain Engine**:
  - Loads real Blender GLB (`/public/models/curtain.glb`).
  - Discovers curtain panels (`Plane.004`, `Plane.005`, `Rideau`) and curtain rod (`Tringle`).
  - Hides tie-backs/brackets per configuration so animations stay clean.
  - Developer inspection utility logs meshes, materials, clips, and dimensions automatically.
- **PBR Fabric System**:
  - Replaces albedo/diffuse map while strictly preserving normal maps, roughness, metalness, and AO properties.
  - Configurable UV tiling (`repeatX`, `repeatY`) with horizontal and vertical repeat sliders.
  - Built-in library of 6 textures (Natural Linen, Navy Velvet, Charcoal Slub, Champagne Silk, Ivory Sheer, Sage Herringbone) + Custom Fabric Uploads.
  - Automatic GPU texture disposal on fabric change to prevent mobile WebGL crashes.
- **Real-World Dimension Scaling**:
  - Computes unscaled 3D bounding box dimensions.
  - Dynamically scales width and height in meters ($0.6\text{m} - 5.0\text{m}$).
- **Embedded Blender Animations**:
  - Coordinates simultaneous animation clips (`Plane.004Action`, `Plane.005Action`).
  - Smooth animated transitions between Open and Closed states.
  - Precise open percentage scrub slider ($0\% - 100\%$).
- **Composite Preview Export**:
  - Offscreen 2D canvas composites the user's room background with the active WebGL canvas frame without any UI buttons.
  - Instant high-resolution JPEG download.
- **Production Backend**:
  - Express server with Helmet security headers, CORS, rate limiting, and Sharp image processing.
  - Pluggable `StorageService` for local storage or cloud buckets (AWS S3, Cloudflare R2).

---

## 🛠 Technology Stack

- **Frontend**: React 18, React Three Fiber (v8), `@react-three/drei`, Three.js (v0.167), Zustand, Tailwind CSS v4, Lucide Icons.
- **Build Tool**: Vite 5.
- **Backend**: Node.js 20+, Express 4, Multer, Sharp, Helmet, CORS, express-rate-limit.

---

## 📦 Prerequisites & Installation

1. **Node.js**: Version 18 or newer (v20+ recommended). Check with:
   ```bash
   node -v
   ```

2. **Clone & Install Dependencies**:
   ```bash
   cd curtain-visualizer
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

---

## 🚀 Running the Application

### Development Mode (Concurrent Server & Client)
```bash
npm run dev
```
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- Requests from `/api`, `/uploads`, `/fabrics`, `/rooms`, `/models` are automatically proxied by Vite.

### Production Mode
```bash
# 1. Build the frontend production bundle
npm run build

# 2. Start the Express server (serves both API and static dist SPA)
npm start
```
Open `http://localhost:5000` in your browser.

---

## 🎨 Blender 3D Model Integration

### How to Swap the Curtain GLB Model
1. Export your curtain model from Blender as a **GLB binary** (`.glb`).
   - *Ensure UV mapping is applied to the curtain meshes for fabric tiling.*
   - *Ensure Open and Close animations are saved as NLA tracks or actions.*
2. Copy the exported `.glb` file into:
   ```text
   public/models/my_curtain.glb
   ```
3. Open `src/config/curtainConfig.js` and point `modelUrl` to your new file:
   ```javascript
   export const CURTAIN_CONFIG = {
     modelUrl: '/models/my_curtain.glb',
     ...
   };
   ```

### Matching Mesh & Material Names
If your new Blender model uses custom mesh names or material names, adjust:
```javascript
// Material names in Blender to receive fabric texture
targetMaterials: ['curtain_fabric', 'velvet_mat', 'tissus curtain'],

// Mesh names in Blender that represent the folding curtain panels
curtainMeshes: ['curtain_left', 'curtain_right', 'panel_front'],

// Meshes to hide (e.g. tiebacks, hooks)
excludeMeshes: ['tieback', 'holdback', 'hook', 'bracket'],
```

### Inspecting Model Structure
When the app loads in development, open your browser DevTools console. The visualizer automatically logs:
```text
🔍 [Curtain 3D Model Inspection]
Meshes (6): ['Plane.004', 'Plane.001', 'Plane.010', 'Plane.005', 'Cylinder.002', 'Maillage.024']
Materials (5): ['Tissus curtain', 'Voilage', 'Ral7016', 'glass noise', 'TIEBACKS']
Animation Clips (2): ['Plane.004Action (3.29s)', 'Plane.005Action (2.04s)']
Original Dimensions (m): { width: '2.180', height: '2.560', depth: '0.340' }
```

---

## 🧵 Fabric Pipeline & Custom Uploads

### Built-in Fabric Library
Bundled fabrics are located in `/public/fabrics/` in high-resolution WebP format:
- `linen_natural.webp` (Natural Beige Linen)
- `velvet_navy.webp` (Royal Navy Velvet)
- `cotton_charcoal.webp` (Charcoal Slub Weave)
- `silk_champagne.webp` (Champagne Shimmer Silk)
- `sheer_ivory.webp` (Ivory Sheer Weave)
- `geo_sage.webp` (Sage Herringbone Jacquard)

### Uploading Custom Fabrics
Users can upload their own fabric swatches via the UI or API (`POST /api/fabrics`):
- **High Visual Fidelity**: Uses Sharp with high quality (`92`) WebP encoding without aggressive downsampling.
- **Customizable Tiling**: Set `repeatX` and `repeatY` from the slider tray ($1\times1$ to $10\times10$).
- **Persistence**: User-uploaded fabrics are saved to `uploads/custom_fabrics.json` and persist across restarts.

---

## ⚙ Configuration Guide (`src/config/curtainConfig.js`)

All critical defaults can be changed in `src/config/curtainConfig.js`:

```javascript
export const CURTAIN_CONFIG = {
  modelUrl: '/models/curtain.glb',

  targetMaterials: ['tissus curtain', 'curtain', 'fabric'],
  curtainMeshes: ['plane.004', 'plane.005', 'rideau'],
  excludeMeshes: ['tieback', 'bracket', 'hardware'],

  // Dimensions in meters
  defaultWidth: 2.2,
  defaultHeight: 2.6,
  minWidth: 0.6,
  maxWidth: 5.0,
  minHeight: 0.8,
  maxHeight: 4.5,

  // Default UV repeats
  defaultFabricRepeatX: 4,
  defaultFabricRepeatY: 4,

  // Animation clips
  animationNames: {
    clips: ['Plane.004Action', 'Plane.005Action', 'Open', 'Close'],
    easeDuration: 0.8
  },

  // Lighting
  lighting: {
    ambientIntensity: 0.85,
    directionalIntensity: 1.1,
    directionalPosition: [2, 4, 3],
    fillIntensity: 0.4
  },

  // Mobile DPR clamp (prevents rendering 3x Retina overhead)
  dpr: [1, 2]
};
```

---

## 📡 Backend API Reference

### 1. Health Check
```http
GET /api/health
```
**Response (200)**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "curtain-visualizer-api",
    "uptime": 128.4,
    "timestamp": "2026-09-19T11:05:00.000Z"
  }
}
```

### 2. Get Fabrics Catalog
```http
GET /api/fabrics
```
**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "fabric-linen-natural",
      "name": "Natural Beige Linen",
      "imageUrl": "/fabrics/linen_natural.webp",
      "repeatX": 4,
      "repeatY": 4,
      "category": "Linen",
      "isCustom": false
    }
  ]
}
```

### 3. Upload Custom Fabric
```http
POST /api/fabrics
Content-Type: multipart/form-data
```
**Body**:
- `fabric`: Binary image file (JPG, PNG, WebP $\le 12\text{MB}$)
- `name`: String (optional)
- `repeatX`: Number (default `4`)
- `repeatY`: Number (default `4`)

### 4. Delete Custom Fabric
```http
DELETE /api/fabrics/:id
```

### 5. Upload Room Photo
```http
POST /api/uploads
Content-Type: multipart/form-data
```
**Body**:
- `image`: Binary photo file (JPG, PNG, WebP $\le 15\text{MB}$)

---

## 📸 Export & Preview Compositing

The export pipeline (`src/utils/imageUtils.js`):
1. Loads the source room background image at native resolution.
2. Creates an offscreen Canvas matching background natural dimensions.
3. Draws the background image.
4. Draws the Three.js WebGL canvas frame (`preserveDrawingBuffer: true`) exactly aligned over the image.
5. Emits an uncompressed/high-quality JPEG data URL.
6. Triggers browser download without capturing UI buttons or panels.

---

## 🚢 Production Deployment

### Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Cloud Platforms (Render, Railway, Fly.io, Heroku)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT=5000`
  - `NODE_ENV=production`
  - `STORAGE_PATH=./uploads`

---

## ❓ Troubleshooting & FAQs

### Q: Why does the curtain appear too large or too small?
Adjust `defaultWidth` and `defaultHeight` in `src/config/curtainConfig.js`, or use the **Size** slider in the bottom panel.

### Q: Why isn't the fabric texture updating on my custom Blender model?
Check that your Blender model's meshes have UV maps unwraped (`UV Editing` in Blender). Also verify that `CURTAIN_CONFIG.targetMaterials` includes your model's material name.

### Q: Can I run this offline without an internet connection?
Yes. All assets (`curtain.glb`, fabric textures, room images, Three.js shaders) are completely self-contained in the repository. No external CDNs are required at runtime.

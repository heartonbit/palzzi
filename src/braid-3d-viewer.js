import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KumihimoDisk } from './engine/kumihimo.js';
import {
  D3_TUBE_RADIUS, D3_PITCH_MULT, D3_STEPS,
  D3_OVER_UNDER, D3_INTERP, D3_TUBE_SEG,
} from './braid-config.js';

const PALETTE = [
  '#e63946','#f4a261','#2a9d8f','#264653',
  '#e76f51','#f28482','#84a59d','#f2cc8f',
  '#6a994e','#bc4749','#386641','#540b0e',
  '#6930c3','#5e60ce','#5390d9','#4ea8de',
  '#48cae4','#90e0ef','#ade8f4','#caf0f8',
  '#ff9e00','#ff6d00','#ff3d00','#d50000',
  '#aa00ff','#651fff','#304ffe','#00b0ff',
  '#7cb518','#38b000','#008000','#006400',
];

// --- Kajiya-Kay Anisotropic Thread Shader ---
const VERTEX_SHADER = `
  attribute vec3 tangent;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vTangent = normalize(normalMatrix * tangent);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform vec3 uLightDir1;
  uniform vec3 uLightDir2;
  uniform vec3 uViewPos;

  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 V = normalize(uViewPos - vWorldPos);

    vec3 L1 = normalize(uLightDir1);
    float sinLT1 = sqrt(1.0 - pow(dot(L1, T), 2.0));
    float diff1 = sinLT1 * 0.6;

    vec3 L2 = normalize(uLightDir2);
    float sinLT2 = sqrt(1.0 - pow(dot(L2, T), 2.0));
    float diff2 = sinLT2 * 0.25;

    vec3 H1 = normalize(L1 + V);
    float dotHT1 = dot(H1, T);
    float sinHT1 = sqrt(1.0 - dotHT1 * dotHT1);
    float spec1 = pow(sinHT1, 16.0) * 0.15;

    float fiber = 0.98 + 0.02 * sin(vUv.x * 200.0);

    float rim = 1.0 - max(dot(N, V), 0.0);
    rim = pow(rim, 3.0) * 0.08;

    vec3 ambient = uColor * 0.35;
    vec3 diffuse = uColor * (diff1 + diff2) * fiber;
    vec3 specular = vec3(1.0) * spec1;
    vec3 rimColor = uColor * rim;

    vec3 color = ambient + diffuse + specular + rimColor;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function computeTangents(geometry) {
  const pos = geometry.attributes.position;
  const tangents = new Float32Array(pos.count * 3);
  const idx = geometry.index;

  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
      const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
      const bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b);
      const edge1 = new THREE.Vector3(bx - ax, by - ay, bz - az);
      const edge2 = new THREE.Vector3(
        pos.getX(c) - ax, pos.getY(c) - ay, pos.getZ(c) - az
      );
      const faceTangent = edge1.normalize();
      for (const vi of [a, b, c]) {
        tangents[vi * 3] += faceTangent.x;
        tangents[vi * 3 + 1] += faceTangent.y;
        tangents[vi * 3 + 2] += faceTangent.z;
      }
    }
  }
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(tangents[i * 3], tangents[i * 3 + 1], tangents[i * 3 + 2]);
    v.normalize();
    tangents[i * 3] = v.x; tangents[i * 3 + 1] = v.y; tangents[i * 3 + 2] = v.z;
  }
  geometry.setAttribute('tangent', new THREE.BufferAttribute(tangents, 3));
}

function getThreadColors(nThreads, colors) {
  if (Array.isArray(colors)) return colors.slice(0, nThreads);
  if (colors === 'two') {
    const c = ['#e63946', '#264653'];
    return Array.from({ length: nThreads }, (_, i) => c[i % 2]);
  }
  if (colors === 'pairs') {
    const pc = ['#e63946','#f4a261','#2a9d8f','#264653','#e76f51','#f28482','#84a59d','#f2cc8f'];
    return Array.from({ length: nThreads }, (_, i) => pc[Math.floor(i / 2) % pc.length]);
  }
  return Array.from({ length: nThreads }, (_, i) => PALETTE[i % PALETTE.length]);
}

/**
 * Calculate a pastel background color that complements the thread colors.
 * Uses the complementary hue with low saturation for a soft pastel look.
 * @param {string[]} threadColors - Array of hex color strings
 * @returns {number} THREE.js color value (0xRRGGBB)
 */
export function computePastelBackground(threadColors) {
  if (!threadColors || threadColors.length === 0) return 0xf0e6f6; // default lavender

  let totalHue = 0;
  let count = 0;

  for (const hex of threadColors) {
    const color = new THREE.Color(hex);
    const hsl = {};
    color.getHSL(hsl);
    // Only include saturated colors in the average (skip grays/whites/blacks)
    if (hsl.s > 0.1 && hsl.l > 0.1 && hsl.l < 0.9) {
      totalHue += hsl.h;
      count++;
    }
  }

  // Default if no saturated colors found
  if (count === 0) return 0xf0e6f6; // lavender

  // Average hue + complementary (180° offset)
  const avgHue = totalHue / count;
  const compHue = (avgHue + 0.5) % 1.0;

  // Pastel: high lightness, low-medium saturation
  const pastel = new THREE.Color();
  pastel.setHSL(compHue, 0.35, 0.88);
  return pastel.getHex();
}

/**
 * Reusable 3D Kumihimo braid viewer.
 *
 * Usage:
 *   const viewer = new Braid3DViewer(containerEl, {
 *     nThreads: 16,
 *     steps: 200,
 *     tubeRadius: 0.1,
 *     colors: 'multi',        // 'multi' | 'pairs' | 'two' | ['#hex', ...]
 *     background: 0x1a1a1a,
 *   });
 *   viewer.update({ nThreads: 24, steps: 300 });
 *   viewer.dispose();
 */
export class Braid3DViewer {
  constructor(container, opts = {}) {
    this.container = container;
    this.braidGroup = null;
    this._disposed = false;

    // Options with defaults (from braid-config.js)
    this.opts = {
      nThreads: 16,
      steps: D3_STEPS,
      tubeRadius: D3_TUBE_RADIUS,
      pitchMultiplier: D3_PITCH_MULT,
      overUnder: D3_OVER_UNDER,
      interp: D3_INTERP,
      tubeSegments: D3_TUBE_SEG,
      colors: 'multi',
      background: 0xf8f9fa,
      ...opts,
    };

    this._initScene();
    this._animate();
    this._setupResize();
    this.build();
  }

  _initScene() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.opts.background);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000);
    this.camera.position.set(0, 10, 35);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dir1.position.set(15, 25, 20);
    this.scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir2.position.set(-10, 5, -15);
    this.scene.add(dir2);
  }

  _setupResize() {
    this._resizeObserver = new ResizeObserver(() => {
      if (this._disposed) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this._resizeObserver.observe(this.container);
  }

  _animate() {
    if (this._disposed) return;
    requestAnimationFrame(() => this._animate());
    this.orbitControls.update();
    if (this.braidGroup) {
      this.braidGroup.traverse(child => {
        if (child.material?.uniforms?.uViewPos) {
          child.material.uniforms.uViewPos.value.copy(this.camera.position);
        }
      });
    }
    this.renderer.render(this.scene, this.camera);
  }

  build() {
    const { nThreads, steps, tubeRadius: tubeR, colors } = this.opts;
    const overUnder = this.opts.overUnder;
    const interp = this.opts.interp;
    const tubeSeg = this.opts.tubeSegments;

    // Cleanup previous
    if (this.braidGroup) {
      this.scene.remove(this.braidGroup);
      this.braidGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this.braidGroup = new THREE.Group();

    const radius = (nThreads * 2 * tubeR) / (2 * Math.PI);
    const rowPitch = tubeR * this.opts.pitchMultiplier;
    const slotsCount = nThreads >= 20 ? 64 : 32;
    const threadColors = getThreadColors(nThreads, colors);

    const disk = new KumihimoDisk(nThreads);
    disk.init(threadColors);
    for (let s = 0; s < steps; s++) disk.weaveRowFast();

    if (disk.productColors.length <= 1) { return; }

    // Build per-thread paths
    const threadMap = {};

    for (let r = 0; r < disk.productColors.length; r++) {
      const row = disk.productColors[r];
      const sorted = [...row].sort((a, b) => a.slot - b.slot);

      for (let idx = 0; idx < sorted.length; idx++) {
        const t = sorted[idx];
        if (!threadMap[t.id]) threadMap[t.id] = { pts: [], color: t.color };

        const angle = (t.slot / slotsCount) * Math.PI * 2 - Math.PI / 2;
        const overUnderOffset = (idx % 2 === 0) ? tubeR * overUnder : -tubeR * overUnder;
        const r_adj = radius + overUnderOffset;

        const pt = new THREE.Vector3(
          r_adj * Math.sin(angle),
          -r * rowPitch,
          r_adj * Math.cos(angle)
        );

        const prevPts = threadMap[t.id].pts;
        if (prevPts.length > 0 && r > 0) {
          const prev = prevPts[prevPts.length - 1];
          for (let k = 1; k < interp; k++) {
            prevPts.push(new THREE.Vector3().lerpVectors(prev, pt, k / interp));
          }
        }
        prevPts.push(pt);
      }
    }

    // Create tubes
    for (const id in threadMap) {
      const { pts, color } = threadMap[id];
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      const geo = new THREE.TubeGeometry(curve, pts.length * 2, tubeR, tubeSeg, false);
      computeTangents(geo);

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uLightDir1: { value: new THREE.Vector3(15, 25, 20).normalize() },
          uLightDir2: { value: new THREE.Vector3(-10, 5, -15).normalize() },
          uViewPos: { value: this.camera.position },
        },
      });
      this.braidGroup.add(new THREE.Mesh(geo, mat));
    }

    this.scene.add(this.braidGroup);

    // Camera fit — zoomed out for better overview
    const totalH = (disk.productColors.length - 1) * rowPitch;
    const camDist = Math.max(radius * 5, totalH * 0.6, 8);
    this.camera.position.set(radius * 4, -totalH * 0.35, camDist);
    this.orbitControls.target.set(0, -totalH * 0.35, 0);
    this.orbitControls.update();
  }

  update(opts) {
    Object.assign(this.opts, opts);
    this.build();
  }

  /**
   * Zoom the camera in or out by moving it along the view direction.
   * @param {number} factor - Zoom factor (>1 zooms out, <1 zooms in)
   */
  zoom(factor) {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.orbitControls.target);
    offset.multiplyScalar(factor);
    this.camera.position.copy(this.orbitControls.target).add(offset);
    this.orbitControls.update();
  }

  /**
   * Render one frame and return the canvas as a JPEG data URL.
   * @param {number}  [width]       - Output width (defaults to canvas current width)
   * @param {number}  [height]      - Output height (defaults to canvas current height)
   * @param {number}  [rotateDeg]   - Camera roll in degrees around view direction
   * @param {number}  [fov]         - Field of view in degrees (smaller = more zoomed in)
   * @returns {string} JPEG data URL
   */
  captureSnapshot(width, height, rotateDeg = 0, fov = 0) {
    if (!this.renderer || !this.scene || !this.camera) return '';
    const w = width || this.renderer.domElement.width;
    const h = height || this.renderer.domElement.height;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const origFov = this.camera.fov;
    const origCamPos = this.camera.position.clone();
    const origUp = this.camera.up.clone();
    const target = this.orbitControls.target.clone();

    // Roll camera around its view direction (tilt the frame)
    if (rotateDeg !== 0) {
      const viewDir = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(viewDir, THREE.MathUtils.degToRad(rotateDeg));
      this.camera.up.applyQuaternion(rollQuat).normalize();
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
    }
    // Set FOV if specified
    if (fov > 0) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);

    // Restore original state
    this.camera.position.copy(origCamPos);
    this.camera.up.copy(origUp);
    this.camera.fov = origFov;
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    return this.renderer.domElement.toDataURL('image/jpeg', 0.92);
  }

  /**
   * Generate a snapshot from pattern data.
   * Creates a temporary viewer, renders, and returns the snapshot.
   * @param {HTMLElement} container - Hidden container for rendering
   * @param {Object} patternData - Pattern data (nThreads, colors, maxSteps, templateId)
   * @param {Array} templates - KUMIHIMO_TEMPLATES array
   * @param {number} defaultSteps - Default D3_STEPS value
   * @param {Object} [options] - Snapshot options (rotateDeg, fov, width, height)
   * @returns {Promise<string>} JPEG data URL or empty string
   */
  static async generateSnapshot(container, patternData, templates, defaultSteps, options = {}) {
    const { rotateDeg = 25, fov = 15, width = 320, height = 200 } = options;

    const tmpl = templates.find(t => t.id === patternData.templateId);
    const nThreads = patternData.nThreads || (tmpl ? tmpl.threads : 8);
    const colors = patternData.colors || (tmpl ? [...tmpl.defaultColors] : []);

    // Ensure colors match thread count
    while (colors.length < nThreads) colors.push('#cccccc');

    const bgColor = computePastelBackground(colors);

    const viewer = new Braid3DViewer(container, {
      nThreads,
      steps: Math.min(defaultSteps, patternData.maxSteps || defaultSteps),
      tubeRadius: Math.max(0.06, Math.min(0.15, 3.5 / nThreads)),
      colors: [...colors],
      background: bgColor,
    });

    // Render one frame to initialize the drawing buffer
    viewer.renderer.render(viewer.scene, viewer.camera);

    const dataUrl = viewer.captureSnapshot(width, height, rotateDeg, fov);
    viewer.dispose();

    return dataUrl;
  }

  dispose() {
    this._disposed = true;
    this._resizeObserver?.disconnect();
    if (this.braidGroup) {
      this.braidGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

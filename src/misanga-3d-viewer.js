import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MisangaLoom } from './engine/misanga.js';

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

// Kajiya-Kay Anisotropic Thread Shader (same as kumihimo)
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

/**
 * Compute a pastel background color complementing the thread colors.
 */
export function computeMisangaPastelBackground(threadColors) {
  if (!threadColors || threadColors.length === 0) return 0xf0e6f6;
  let totalHue = 0, count = 0;
  for (const hex of threadColors) {
    const color = new THREE.Color(hex);
    const hsl = {};
    color.getHSL(hsl);
    if (hsl.s > 0.1 && hsl.l > 0.1 && hsl.l < 0.9) {
      totalHue += hsl.h;
      count++;
    }
  }
  if (count === 0) return 0xf0e6f6;
  const avgHue = totalHue / count;
  const compHue = (avgHue + 0.5) % 1.0;
  const pastel = new THREE.Color();
  pastel.setHSL(compHue, 0.35, 0.88);
  return pastel.getHex();
}

/**
 * Reusable 3D Misanga bracelet viewer.
 * Renders a flat band of knots using Three.js TubeGeometry + Kajiya-Kay shader.
 */
export class Misanga3DViewer {
  constructor(container, opts = {}) {
    this.container = container;
    this.braidGroup = null;
    this._disposed = false;

    this.opts = {
      nStrings: 4,
      steps: 200,
      tubeRadius: 0.15,
      stringSpacing: 1.2,
      rowHeight: 0.6,
      overUnder: 0.12,
      interp: 6,
      tubeSegments: 8,
      patternType: 'diagonal',
      colors: ['#e63946', '#f4a261', '#2a9d8f', '#264653'],
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
    this.camera.position.set(0, 5, 20);

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
    const { nStrings, steps, tubeRadius, stringSpacing, rowHeight, overUnder, interp, tubeSegments, patternType, colors } = this.opts;

    if (this.braidGroup) {
      this.scene.remove(this.braidGroup);
      this.braidGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this.braidGroup = new THREE.Group();

    // Simulate the loom
    const loom = new MisangaLoom(nStrings);
    const threadColors = Array.isArray(colors) ? colors.slice(0, nStrings) : PALETTE.slice(0, nStrings);
    while (threadColors.length < nStrings) threadColors.push('#cccccc');
    loom.init(threadColors);

    const allDirections = [];
    for (let r = 0; r < steps; r++) {
      const dirs = MisangaLoom.getPatternDirections(patternType, r, nStrings);
      allDirections.push(dirs);
      loom.tieRowFast(dirs);
    }

    if (loom.productColors.length <= 1) return;

    // Build per-thread paths through the knot structure
    // Each thread has a position (0..nStrings-1) at each row
    // Track thread paths: for each original thread id, record its position at each row
    const threadPaths = {};
    for (let i = 0; i < nStrings; i++) {
      threadPaths[i] = { pts: [], color: threadColors[i] };
    }

    // Initial positions (row 0)
    const positionsAtRow = [];
    const initPos = {};
    for (let i = 0; i < nStrings; i++) {
      initPos[i] = i; // thread i is at position i
    }
    positionsAtRow.push({ ...initPos });

    // Track positions through rows
    for (let r = 0; r < allDirections.length; r++) {
      const dirs = allDirections[r];
      const prevPos = positionsAtRow[positionsAtRow.length - 1];
      const newPos = { ...prevPos };

      // Apply two-pass swap
      const tempPos = { ...prevPos };
      // Pass 1: even knots
      for (let k = 0; k < dirs.length; k += 2) {
        // Find which threads are at positions k and k+1
        let threadA = -1, threadB = -1;
        for (const [tid, pos] of Object.entries(tempPos)) {
          if (pos === k) threadA = parseInt(tid);
          if (pos === k + 1) threadB = parseInt(tid);
        }
        if (threadA >= 0 && threadB >= 0) {
          tempPos[threadA] = k + 1;
          tempPos[threadB] = k;
        }
      }
      // Pass 2: odd knots
      for (let k = 1; k < dirs.length; k += 2) {
        let threadA = -1, threadB = -1;
        for (const [tid, pos] of Object.entries(tempPos)) {
          if (pos === k) threadA = parseInt(tid);
          if (pos === k + 1) threadB = parseInt(tid);
        }
        if (threadA >= 0 && threadB >= 0) {
          tempPos[threadA] = k + 1;
          tempPos[threadB] = k;
        }
      }

      positionsAtRow.push(tempPos);
    }

    // Build 3D points for each thread
    const totalWidth = (nStrings - 1) * stringSpacing;
    const halfWidth = totalWidth / 2;

    for (let r = 0; r < positionsAtRow.length; r++) {
      const posMap = positionsAtRow[r];
      for (let tid = 0; tid < nStrings; tid++) {
        const pos = posMap[tid];
        const x = pos * stringSpacing - halfWidth;
        const y = -r * rowHeight;
        // Over/under: alternate z based on whether this thread is "on top" at this row
        const z = (r % 2 === 0) ? (tid % 2 === 0 ? overUnder : -overUnder) : (tid % 2 === 0 ? -overUnder : overUnder);

        const pt = new THREE.Vector3(x, y, z);
        const prevPts = threadPaths[tid].pts;

        if (prevPts.length > 0 && r > 0) {
          const prev = prevPts[prevPts.length - 1];
          for (let k = 1; k < interp; k++) {
            prevPts.push(new THREE.Vector3().lerpVectors(prev, pt, k / interp));
          }
        }
        prevPts.push(pt);
      }
    }

    // Create tubes for each thread
    for (let tid = 0; tid < nStrings; tid++) {
      const { pts, color } = threadPaths[tid];
      if (pts.length < 2) continue;

      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      const geo = new THREE.TubeGeometry(curve, pts.length * 2, tubeRadius, tubeSegments, false);
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

    // Camera fit
    const totalH = (positionsAtRow.length - 1) * rowHeight;
    const camDist = Math.max(totalWidth * 2, totalH * 0.4, 8);
    this.camera.position.set(0, -totalH * 0.35, camDist);
    this.orbitControls.target.set(0, -totalH * 0.35, 0);
    this.orbitControls.update();
  }

  update(opts) {
    Object.assign(this.opts, opts);
    this.build();
  }

  zoom(factor) {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.orbitControls.target);
    offset.multiplyScalar(factor);
    this.camera.position.copy(this.orbitControls.target).add(offset);
    this.orbitControls.update();
  }

  captureSnapshot(width, height, rotateDeg = 0, fov = 0) {
    if (!this.renderer || !this.scene || !this.camera) return '';
    const origW = this.renderer.domElement.width;
    const origH = this.renderer.domElement.height;
    const w = width || origW;
    const h = height || origH;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const origFov = this.camera.fov;
    const origCamPos = this.camera.position.clone();
    const origUp = this.camera.up.clone();
    const target = this.orbitControls.target.clone();

    if (rotateDeg !== 0) {
      const viewDir = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(viewDir, THREE.MathUtils.degToRad(rotateDeg));
      this.camera.up.applyQuaternion(rollQuat).normalize();
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
    }
    if (fov > 0) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/jpeg', 0.92);

    this.renderer.setSize(origW, origH);
    this.camera.position.copy(origCamPos);
    this.camera.up.copy(origUp);
    this.camera.fov = origFov;
    this.camera.aspect = origW / origH;
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    return dataUrl;
  }

  static async generateSnapshot(container, patternData, templates, defaultSteps, options = {}) {
    const { rotateDeg = 15, fov = 20, width = 320, height = 200 } = options;

    const tmpl = templates.find(t => t.id === patternData.templateId);
    const nStrings = patternData.nStrings || (tmpl ? tmpl.strings : 4);
    const colors = patternData.colors || (tmpl ? [...tmpl.defaultColors] : []);
    const patternType = patternData.patternType || (tmpl ? tmpl.patternType : 'diagonal');

    while (colors.length < nStrings) colors.push('#cccccc');

    const bgColor = computeMisangaPastelBackground(colors);

    const viewer = new Misanga3DViewer(container, {
      nStrings,
      steps: Math.min(defaultSteps, patternData.maxSteps || defaultSteps),
      tubeRadius: 0.15,
      colors: [...colors],
      patternType,
      background: bgColor,
    });

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

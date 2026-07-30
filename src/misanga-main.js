import { MisangaLoom } from './engine/misanga.js';
import { Misanga3DViewer, computeMisangaPastelBackground } from './misanga-3d-viewer.js';
import { MISANGA_TEMPLATES } from './templates/misanga-templates.js';
import { TRANSLATIONS } from './i18n.js';
import { db } from './firebase/config.js';
import {
  collection, addDoc, doc, getDoc, getDocs, query, where, orderBy,
  serverTimestamp, runTransaction, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { signInWithGoogle, signOutUser, onAuthChange } from './firebase/auth.js';
import { initAdSense } from './ads.js';

// ── State ──
let currentLang = 'en';
let currentUser = null;
let loom = new MisangaLoom(4);
let activeTemplate = MISANGA_TEMPLATES[0];
let stringColors = [...activeTemplate.defaultColors];
let currentStep = 0;
let isWeaving = false;
let weaveTimer = null;
let viewer3d = null;
let savedPatternId = null;
let userIsAdmin = false;

// Color presets (localStorage)
const COLOR_PRESETS_KEY = 'palzzi-misanga-presets';
let colorPresets = [];

// ── DOM refs ──
const authArea = document.getElementById('auth-area');
const templateSelect = document.getElementById('template-select');
const templateDesc = document.getElementById('template-desc');
const metaStrings = document.getElementById('meta-strings');
const knotCanvas = document.getElementById('knot-canvas');
const ctxKnot = knotCanvas.getContext('2d');
const btnWeave = document.getElementById('btn-weave');
const btnSettings = document.getElementById('btn-settings');
const btnSaveGallery = document.getElementById('btn-save-gallery');
const btnShareUrl = document.getElementById('btn-share-url');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnLike = document.getElementById('btn-like');
const previewLikeCount = document.getElementById('preview-like-count');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const colorPopup = document.getElementById('color-popup');
const toastEl = document.getElementById('toast-message');
const sidebarPatternList = document.getElementById('sidebar-pattern-list');
const sidebarLoading = document.getElementById('sidebar-loading');
const sidebarSort = document.getElementById('sidebar-sort');
const btnLangToggle = document.getElementById('btn-lang-toggle');
const langPopup = document.getElementById('lang-popup');
const btnLangKo = document.getElementById('btn-lang-ko');
const btnLangEn = document.getElementById('btn-lang-en');

// ── Toast ──
function showToast(msg, duration = 2500) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

// ── i18n ──
function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const t = TRANSLATIONS[lang];
    if (t && t[key]) {
      const icon = el.querySelector('i');
      if (icon) el.innerHTML = `${icon.outerHTML} ${t[key]}`;
      else el.textContent = t[key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const t = TRANSLATIONS[lang];
    if (t && t[key]) el.placeholder = t[key];
  });
  populateTemplates();
  updateTemplateDesc();
  drawKnotEditor();
  loadSidebarPatterns();
}

// ── Templates ──
function populateTemplates() {
  const t = TRANSLATIONS[currentLang];
  templateSelect.innerHTML = '';
  MISANGA_TEMPLATES.forEach(tmpl => {
    const opt = document.createElement('option');
    opt.value = tmpl.id;
    opt.textContent = currentLang === 'ko' ? tmpl.name_ko : tmpl.name_en;
    templateSelect.appendChild(opt);
  });
  templateSelect.value = activeTemplate.id;
}

function updateTemplateDesc() {
  const desc = currentLang === 'ko' ? activeTemplate.desc_ko : activeTemplate.desc_en;
  templateDesc.textContent = desc;
  metaStrings.innerHTML = `<i class="fa-solid fa-braille"></i> ${activeTemplate.strings} ${TRANSLATIONS[currentLang].metaThreads || '가닥'}`;
}

function loadTemplate(templateId) {
  const tmpl = MISANGA_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return;
  activeTemplate = tmpl;
  stringColors = [...tmpl.defaultColors];
  currentStep = 0;
  loom = new MisangaLoom(tmpl.strings);
  loom.init(stringColors);
  updateTemplateDesc();
  drawKnotEditor();
  rebuild3D();
}

// ── 2D Knot Editor Drawing ──
function drawKnotEditor() {
  const W = knotCanvas.width;
  const H = knotCanvas.height;
  const nS = loom.nStrings;
  const nK = nS - 1;

  ctxKnot.clearRect(0, 0, W, H);
  ctxKnot.fillStyle = '#f8f9fa';
  ctxKnot.fillRect(0, 0, W, H);

  const margin = 60;
  const usableW = W - margin * 2;
  const usableH = H - margin * 2;
  const stringSpacing = usableW / (nS - 1);
  const rowSpacing = Math.min(40, usableH / Math.max(currentStep + 2, 8));

  // Draw initial string headers
  for (let i = 0; i < nS; i++) {
    const x = margin + i * stringSpacing;
    ctxKnot.beginPath();
    ctxKnot.arc(x, margin - 15, 12, 0, Math.PI * 2);
    ctxKnot.fillStyle = stringColors[i];
    ctxKnot.fill();
    ctxKnot.strokeStyle = '#333';
    ctxKnot.lineWidth = 1.5;
    ctxKnot.stroke();
  }

  // Draw strings and knots row by row
  const state = loom.state.map(s => ({ ...s }));
  const positions = {};
  for (let i = 0; i < nS; i++) positions[i] = i;

  // Initial vertical lines to first row
  for (let i = 0; i < nS; i++) {
    const x = margin + i * stringSpacing;
    ctxKnot.beginPath();
    ctxKnot.moveTo(x, margin - 3);
    ctxKnot.lineTo(x, margin + 10);
    ctxKnot.strokeStyle = stringColors[i];
    ctxKnot.lineWidth = 4;
    ctxKnot.stroke();
  }

  // Track string positions through rows
  const posHistory = [{ ...positions }];
  const tempState = loom.productColors.slice(0, currentStep + 1);

  for (let r = 0; r < currentStep && r < loom.knotHistory.length; r++) {
    const knots = loom.knotHistory[r];
    const y1 = margin + 10 + r * rowSpacing;
    const y2 = y1 + rowSpacing;
    const yMid = (y1 + y2) / 2;

    // Get positions at start of this row
    const prevPos = posHistory[posHistory.length - 1];
    const curPos = { ...prevPos };

    // Apply two-pass swap to track positions
    const tmpPos = { ...prevPos };
    const dirs = MisangaLoom.getPatternDirections(activeTemplate.patternType, r, nS);

    // Pass 1: even knots
    for (let k = 0; k < dirs.length; k += 2) {
      let tA = -1, tB = -1;
      for (const [tid, pos] of Object.entries(tmpPos)) {
        if (pos === k) tA = parseInt(tid);
        if (pos === k + 1) tB = parseInt(tid);
      }
      if (tA >= 0 && tB >= 0) {
        tmpPos[tA] = k + 1;
        tmpPos[tB] = k;
      }
    }
    // Pass 2: odd knots
    for (let k = 1; k < dirs.length; k += 2) {
      let tA = -1, tB = -1;
      for (const [tid, pos] of Object.entries(tmpPos)) {
        if (pos === k) tA = parseInt(tid);
        if (pos === k + 1) tB = parseInt(tid);
      }
      if (tA >= 0 && tB >= 0) {
        tmpPos[tA] = k + 1;
        tmpPos[tB] = k;
      }
    }
    posHistory.push(tmpPos);

    // Draw knot lines
    for (let k = 0; k < knots.length; k++) {
      const knot = knots[k];
      // Find thread positions at start of this row
      let leftThread = -1, rightThread = -1;
      for (const [tid, pos] of Object.entries(prevPos)) {
        if (pos === k) leftThread = parseInt(tid);
        if (pos === k + 1) rightThread = parseInt(tid);
      }
      if (leftThread < 0 || rightThread < 0) continue;

      const xL = margin + k * stringSpacing;
      const xR = margin + (k + 1) * stringSpacing;

      if (knot.direction === 'F') {
        // Forward: left goes over right → left moves right
        // Draw left string going to right position
        ctxKnot.beginPath();
        ctxKnot.moveTo(xL, y1);
        ctxKnot.quadraticCurveTo(xL + stringSpacing * 0.5, yMid, xR, y2);
        ctxKnot.strokeStyle = knot.left;
        ctxKnot.lineWidth = 4;
        ctxKnot.stroke();

        // Right string goes under to left
        ctxKnot.beginPath();
        ctxKnot.moveTo(xR, y1);
        ctxKnot.quadraticCurveTo(xR - stringSpacing * 0.5, yMid + 4, xL, y2);
        ctxKnot.strokeStyle = knot.right;
        ctxKnot.lineWidth = 3;
        ctxKnot.stroke();
      } else {
        // Backward: right goes over left → right moves left
        ctxKnot.beginPath();
        ctxKnot.moveTo(xR, y1);
        ctxKnot.quadraticCurveTo(xR - stringSpacing * 0.5, yMid, xL, y2);
        ctxKnot.strokeStyle = knot.right;
        ctxKnot.lineWidth = 4;
        ctxKnot.stroke();

        ctxKnot.beginPath();
        ctxKnot.moveTo(xL, y1);
        ctxKnot.quadraticCurveTo(xL + stringSpacing * 0.5, yMid + 4, xR, y2);
        ctxKnot.strokeStyle = knot.left;
        ctxKnot.lineWidth = 3;
        ctxKnot.stroke();
      }

      // Knot circle
      ctxKnot.beginPath();
      ctxKnot.arc((xL + xR) / 2, yMid, 6, 0, Math.PI * 2);
      ctxKnot.fillStyle = knot.topColor;
      ctxKnot.fill();
      ctxKnot.strokeStyle = '#555';
      ctxKnot.lineWidth = 1;
      ctxKnot.stroke();

      // Direction label
      ctxKnot.fillStyle = '#333';
      ctxKnot.font = 'bold 8px sans-serif';
      ctxKnot.textAlign = 'center';
      ctxKnot.textBaseline = 'middle';
      ctxKnot.fillText(knot.direction, (xL + xR) / 2, yMid);
    }
  }

  // Draw current string positions at bottom
  if (currentStep > 0) {
    const lastPos = posHistory[posHistory.length - 1];
    const bottomY = margin + 10 + currentStep * rowSpacing + 5;
    for (let tid = 0; tid < nS; tid++) {
      const pos = lastPos[tid];
      const x = margin + pos * stringSpacing;
      ctxKnot.beginPath();
      ctxKnot.arc(x, bottomY, 8, 0, Math.PI * 2);
      ctxKnot.fillStyle = stringColors[tid];
      ctxKnot.fill();
      ctxKnot.strokeStyle = '#333';
      ctxKnot.lineWidth = 1;
      ctxKnot.stroke();
    }
  }

  // Step counter
  ctxKnot.fillStyle = '#666';
  ctxKnot.font = '12px Pretendard, sans-serif';
  ctxKnot.textAlign = 'left';
  ctxKnot.fillText(`${TRANSLATIONS[currentLang].stepCounterPrefix || 'Step'}: ${currentStep}`, 10, H - 10);
}

// ── 3D Viewer ──
function init3DViewer() {
  const container = document.getElementById('misanga-3d-container');
  if (!container) return;

  const bgColor = computeMisangaPastelBackground(stringColors);
  viewer3d = new Misanga3DViewer(container, {
    nStrings: loom.nStrings,
    steps: Math.max(currentStep, 50),
    colors: [...stringColors],
    patternType: activeTemplate.patternType,
    background: bgColor,
  });
}

function rebuild3D() {
  if (!viewer3d) {
    init3DViewer();
    return;
  }
  const bgColor = computeMisangaPastelBackground(stringColors);
  viewer3d.update({
    nStrings: loom.nStrings,
    steps: Math.max(currentStep, 50),
    colors: [...stringColors],
    patternType: activeTemplate.patternType,
    background: bgColor,
  });
}

// ── Weave ──
function weaveOneStep() {
  const dirs = MisangaLoom.getPatternDirections(activeTemplate.patternType, currentStep, loom.nStrings);
  loom.tieRow(dirs);
  currentStep++;
  drawKnotEditor();
  rebuild3D();
}

function toggleWeave() {
  if (isWeaving) {
    clearInterval(weaveTimer);
    isWeaving = false;
    btnWeave.innerHTML = '<i class="fa-solid fa-arrows-spin"></i> Weave';
    return;
  }
  isWeaving = true;
  btnWeave.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
  weaveTimer = setInterval(() => {
    weaveOneStep();
    if (currentStep >= 500) {
      clearInterval(weaveTimer);
      isWeaving = false;
      btnWeave.innerHTML = '<i class="fa-solid fa-arrows-spin"></i> Weave';
      showToast(TRANSLATIONS[currentLang].guideComplete);
    }
  }, 200);
}

// ── Color Popup ──
let selectedStringIdx = 0;

function showColorPopup(stringIdx, x, y) {
  selectedStringIdx = stringIdx;
  const picker = document.getElementById('popup-color-picker');
  const hexInput = document.getElementById('popup-color-hex');
  picker.value = stringColors[stringIdx];
  hexInput.value = stringColors[stringIdx];
  colorPopup.classList.remove('hidden');

  // Position near click
  const rect = knotCanvas.getBoundingClientRect();
  colorPopup.style.left = `${x - rect.left + 20}px`;
  colorPopup.style.top = `${y - rect.top - 30}px`;

  populatePopupPresets();
}

function populatePopupPresets() {
  const container = document.getElementById('popup-presets');
  container.innerHTML = '';
  const defaultColors = [
    '#e63946','#f4a261','#2a9d8f','#264653','#e76f51',
    '#f28482','#84a59d','#f2cc8f','#6a994e','#bc4749',
    '#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#0077b6',
    '#ffffff','#1d1d1f','#ff9500','#5856d6','#34c759',
  ];
  const allColors = [...new Set([...defaultColors, ...colorPresets.map(p => p.color)])];
  allColors.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'preset-color-circle';
    btn.style.backgroundColor = c;
    btn.addEventListener('click', () => applyStringColor(c));
    container.appendChild(btn);
  });
}

function applyStringColor(color) {
  stringColors[selectedStringIdx] = color;
  loom.init(stringColors);
  currentStep = 0;
  drawKnotEditor();
  rebuild3D();
  colorPopup.classList.add('hidden');
  showToast(TRANSLATIONS[currentLang].toastColorApplied);
}

// ── Canvas Click Handler ──
function handleCanvasClick(e) {
  const rect = knotCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const nS = loom.nStrings;
  const margin = 60;
  const usableW = knotCanvas.width - margin * 2;
  const stringSpacing = usableW / (nS - 1);

  // Check if clicking on initial string headers
  for (let i = 0; i < nS; i++) {
    const sx = margin + i * stringSpacing;
    const sy = margin - 15;
    if (Math.hypot(x - sx, y - sy) < 15) {
      showColorPopup(i, e.clientX, e.clientY);
      return;
    }
  }
}

// ── Gallery Save ──
async function saveToGallery() {
  if (!currentUser) {
    showToast(TRANSLATIONS[currentLang].signInRequired);
    return;
  }

  const t = TRANSLATIONS[currentLang];
  const patternName = prompt(t.savePatternPrompt, currentLang === 'ko' ? activeTemplate.name_ko : activeTemplate.name_en);
  if (!patternName) return;

  try {
    // Generate 3D snapshot
    let snapshotBase64 = '';
    if (viewer3d) {
      snapshotBase64 = viewer3d.captureSnapshot(320, 200, 15, 20);
    }

    const patternData = {
      style: 'misanga',
      nameKo: patternName,
      nameEn: patternName,
      templateId: activeTemplate.id,
      templateName: currentLang === 'ko' ? activeTemplate.name_ko : activeTemplate.name_en,
      nStrings: loom.nStrings,
      nThreads: loom.nStrings,
      colors: [...stringColors],
      patternType: activeTemplate.patternType,
      maxSteps: currentStep,
      snapshotBase64,
      ownerUid: currentUser.uid,
      ownerName: currentUser.displayName || currentUser.email,
      ownerPhoto: currentUser.photoURL || '',
      likes: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'patterns'), patternData);
    savedPatternId = docRef.id;
    btnShareUrl.disabled = false;
    showToast(t.toastSaveGallery);
    loadSidebarPatterns();
  } catch (err) {
    console.error('Save error:', err);
    showToast(t.toastSaveGalleryError);
  }
}

// ── Share URL ──
function shareUrl() {
  if (!savedPatternId) return;
  const url = `${window.location.origin}/misanga?d=${savedPatternId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(TRANSLATIONS[currentLang].toastShareUrl);
  });
}

// ── Sidebar Patterns ──
async function loadSidebarPatterns() {
  sidebarLoading.classList.remove('hidden');
  try {
    const sortField = sidebarSort.value === 'mostLiked' ? 'likes' : 'createdAt';
    const q = query(
      collection(db, 'patterns'),
      where('style', '==', 'misanga'),
      orderBy(sortField, 'desc')
    );
    const snap = await getDocs(q);
    const patterns = [];
    snap.forEach(docSnap => patterns.push({ id: docSnap.id, ...docSnap.data() }));
    renderSidebarPatterns(patterns);
  } catch (err) {
    console.error('Sidebar load error:', err);
  }
  sidebarLoading.classList.add('hidden');
}

function renderSidebarPatterns(patterns) {
  // Remove old cards
  sidebarPatternList.querySelectorAll('.sidebar-card').forEach(c => c.remove());

  const sentinel = document.getElementById('sidebar-sentinel');
  patterns.forEach(p => {
    const card = document.createElement('div');
    card.className = 'sidebar-card';
    const name = currentLang === 'ko' ? (p.nameKo || p.templateName) : (p.nameEn || p.templateName);
    card.innerHTML = `
      ${p.snapshotBase64
        ? `<img src="${p.snapshotBase64}" alt="${name}" class="sidebar-snapshot">`
        : `<div class="sidebar-no-preview">No Preview</div>`}
      <div class="sidebar-card-info">
        <span class="sidebar-card-name">${name}</span>
        <span class="sidebar-card-meta">${p.nStrings || p.nThreads || 4}${TRANSLATIONS[currentLang].sidebarThreadsUnit} · ${p.maxSteps || 0}${TRANSLATIONS[currentLang].sidebarStepsUnit}</span>
      </div>
    `;
    card.addEventListener('click', () => loadPatternFromDoc(p));
    sidebarPatternList.insertBefore(card, sentinel);
  });
}

async function loadPatternFromDoc(p) {
  const tmpl = MISANGA_TEMPLATES.find(t => t.id === p.templateId);
  if (tmpl) {
    activeTemplate = tmpl;
    templateSelect.value = tmpl.id;
  }
  stringColors = [...(p.colors || tmpl?.defaultColors || [])];
  loom = new MisangaLoom(p.nStrings || p.nThreads || 4);
  loom.init(stringColors);
  currentStep = 0;

  // Re-weave to maxSteps
  const steps = p.maxSteps || 0;
  for (let r = 0; r < steps; r++) {
    const dirs = MisangaLoom.getPatternDirections(activeTemplate.patternType, r, loom.nStrings);
    loom.tieRow(dirs);
    currentStep++;
  }

  updateTemplateDesc();
  drawKnotEditor();
  rebuild3D();
  savedPatternId = p.id;
  btnShareUrl.disabled = false;
}

// ── Auth UI ──
const GOOGLE_ICON_SVG = `<svg class="google-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.81-4.59l-7.98-6.19A23.93 23.93 0 0 0 0 24c0 3.77.9 7.35 2.56 10.59l7.97-6zm"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function updateAuthUI(user) {
  currentUser = user;
  const t = TRANSLATIONS[currentLang];
  if (user) {
    authArea.innerHTML = `
      <div class="auth-user-info">
        <img src="${user.photoURL || '/public/default-avatar.png'}" alt="avatar" class="auth-avatar" referrerpolicy="no-referrer">
        <span class="auth-display-name">${user.displayName || user.email}</span>
      </div>
      <button class="btn-signout" id="btn-signout">${t.signOut}</button>
    `;
    document.getElementById('btn-signout').addEventListener('click', () => signOutUser());
  } else {
    authArea.innerHTML = `
      <button class="btn-google-signin" id="btn-google-signin">
        ${GOOGLE_ICON_SVG} ${t.signInWithGoogle}
      </button>
    `;
    document.getElementById('btn-google-signin').addEventListener('click', () => signInWithGoogle());
  }
}

// ── Settings ──
function setupSettings() {
  btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  settingsClose.addEventListener('click', () => settingsModal.classList.add('hidden'));
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

  const tubeRadiusSlider = document.getElementById('settings-3d-tube-radius');
  const tubeRadiusVal = document.getElementById('settings-3d-tube-radius-val');
  const stepsSlider = document.getElementById('settings-3d-steps');
  const stepsVal = document.getElementById('settings-3d-steps-val');
  const spacingSlider = document.getElementById('settings-string-spacing');
  const spacingVal = document.getElementById('settings-string-spacing-val');

  tubeRadiusSlider?.addEventListener('input', () => {
    tubeRadiusVal.textContent = tubeRadiusSlider.value;
    if (viewer3d) viewer3d.update({ tubeRadius: parseFloat(tubeRadiusSlider.value) });
  });
  stepsSlider?.addEventListener('input', () => {
    stepsVal.textContent = stepsSlider.value;
  });
  spacingSlider?.addEventListener('input', () => {
    spacingVal.textContent = spacingSlider.value;
    if (viewer3d) viewer3d.update({ stringSpacing: parseFloat(spacingSlider.value) });
  });

  document.getElementById('btn-reset-3d-render')?.addEventListener('click', () => {
    tubeRadiusSlider.value = 0.15; tubeRadiusVal.textContent = '0.15';
    stepsSlider.value = 200; stepsVal.textContent = '200';
    spacingSlider.value = 1.2; spacingVal.textContent = '1.2';
    if (viewer3d) viewer3d.update({ tubeRadius: 0.15, stringSpacing: 1.2 });
  });
}

// ── Load from URL ──
async function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const docId = params.get('d');
  if (!docId) return;

  try {
    const docSnap = await getDoc(doc(db, 'patterns', docId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.style === 'misanga') {
        await loadPatternFromDoc({ id: docId, ...data });
        savedPatternId = docId;
        btnShareUrl.disabled = false;
      }
    }
  } catch (err) {
    console.error('URL load error:', err);
  }
}

// ── Init ──
function init() {
  setLanguage('en');

  onAuthChange(async (user) => {
    updateAuthUI(user);
    if (user) {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        userIsAdmin = adminSnap.exists();
      } catch { userIsAdmin = false; }
    }
  });

  // Template select
  templateSelect.addEventListener('change', () => loadTemplate(templateSelect.value));

  // Weave
  btnWeave.addEventListener('click', toggleWeave);

  // Canvas click
  knotCanvas.addEventListener('click', handleCanvasClick);

  // Color popup
  document.getElementById('popup-close').addEventListener('click', () => colorPopup.classList.add('hidden'));
  document.getElementById('popup-color-picker').addEventListener('input', (e) => {
    document.getElementById('popup-color-hex').value = e.target.value;
    applyStringColor(e.target.value);
  });
  document.getElementById('popup-save-btn').addEventListener('click', () => {
    const hex = document.getElementById('popup-color-hex').value;
    applyStringColor(hex);
  });

  // Save / Share
  btnSaveGallery.addEventListener('click', saveToGallery);
  btnShareUrl.addEventListener('click', shareUrl);

  // Zoom
  btnZoomIn.addEventListener('click', () => viewer3d?.zoom(0.85));
  btnZoomOut.addEventListener('click', () => viewer3d?.zoom(1.15));

  // Sidebar sort
  sidebarSort.addEventListener('change', () => loadSidebarPatterns());

  // Language
  btnLangToggle.addEventListener('click', () => langPopup.classList.toggle('hidden'));
  btnLangKo.addEventListener('click', () => { setLanguage('ko'); localStorage.setItem('palzzi-lang', 'ko'); });
  btnLangEn.addEventListener('click', () => { setLanguage('en'); localStorage.setItem('palzzi-lang', 'en'); });

  // Settings
  setupSettings();

  // Init loom
  loom.init(stringColors);
  drawKnotEditor();

  // Init 3D viewer
  init3DViewer();

  // Load from URL
  loadFromUrl();

  // Sidebar
  loadSidebarPatterns();

  // AdSense
  initAdSense();

  // Set initial lang from localStorage
  const savedLang = localStorage.getItem('palzzi-lang');
  if (savedLang && TRANSLATIONS[savedLang]) {
    setLanguage(savedLang);
  }
}

init();

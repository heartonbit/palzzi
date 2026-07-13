import { KumihimoDisk, calcBraidRadius, calcBraidPitch, calcBraidVStretch } from './engine/kumihimo.js';
import * as THREE from 'three';
import { Braid3DViewer, computePastelBackground } from './braid-3d-viewer.js';
import {
  CULLING_RATIO, MAX_STEPS,
  RADIUS_BASE, RADIUS_EXPONENT,
  PITCH_RATIO, PITCH_EXPONENT, PITCH_MULTIPLIER,
  VSTRETCH_BASE, VSTRETCH_EXPONENT,
  STRAND_WIDTH,
  LIGHTING_MIN, LIGHTING_RANGE,
  D3_TUBE_RADIUS, D3_PITCH_MULT, D3_STEPS,
  D3_OVER_UNDER, D3_INTERP, D3_TUBE_SEG,
  D3_MAX_INIT_ATTEMPTS,
} from './braid-config.js';
import { TRANSLATIONS } from './i18n.js';
import { KUMIHIMO_TEMPLATES } from './templates/templates.js';
import { db } from './firebase/config.js';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { signInWithGoogle, signOutUser, onAuthChange } from './firebase/auth.js';
import { initAdSense, injectSidebarAd, injectPlaybackAd } from './ads.js';

// TRANSLATIONS imported from ./i18n.js

// Application State
let currentLang = 'en'; // Default to English as requested
let currentUser = null;
let disk = new KumihimoDisk(8);
let activeTemplate = KUMIHIMO_TEMPLATES[2]; // Default: 8-Strand Candy Cane
let threadColors = [...activeTemplate.defaultColors];
let currentStep = 0;
let urlPatternLoaded = false;

function computePatternKey(templateId, colors) {
  const str = templateId + '|' + colors.map(c => c.toLowerCase()).join(',');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Compact color encoding for short share URLs
function encodeColorsCompact(colors) {
  const hex = colors.map(c => c.replace('#', '')).join('');
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeColorsCompact(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const colors = [];
  for (let i = 0; i < binary.length; i += 3) {
    const r = binary.charCodeAt(i).toString(16).padStart(2, '0');
    const g = binary.charCodeAt(i + 1).toString(16).padStart(2, '0');
    const b = binary.charCodeAt(i + 2).toString(16).padStart(2, '0');
    colors.push(`#${r}${g}${b}`);
  }
  return colors;
}
let selectedThreadIndex = -1; // Index in the active threads (0 to nThreads-1)
let braidZoom = 0.70; // (unused — kept for settings modal compatibility)
let braidRadius = RADIUS_BASE; // Cylinder radius (dynamically adjusted per thread count)
let braidPitch = 3.5; // Braid weaving compactness pitch spacing
let braidVStretch = 1.0; // Vertical stretch factor

// Tunable rendering parameters (mirrors visdev.html)
let braidRadiusBase = RADIUS_BASE;
let braidRadiusExponent = RADIUS_EXPONENT;
let braidPitchRatio = PITCH_RATIO;
let braidPitchExponent = PITCH_EXPONENT;
let braidPitchMultiplier = PITCH_MULTIPLIER;
let braidVStretchBase = VSTRETCH_BASE;
let braidVStretchExponent = VSTRETCH_EXPONENT;
let braidStrandWidth = STRAND_WIDTH;
let braidLightingMin = LIGHTING_MIN;
let braidLightingRange = LIGHTING_RANGE;
let fxDepthWidth = false;
let fxShadow = false;
let fxContrast = false;

// 3D viewer settings (module scope so initBraid3DViewer can access them)
let d3TubeRadius = D3_TUBE_RADIUS;
let d3PitchMult = D3_PITCH_MULT;
let d3Steps = D3_STEPS;
let d3OverUnder = D3_OVER_UNDER;
let d3Interp = D3_INTERP;
let d3TubeSeg = D3_TUBE_SEG;

// Auto-adjust radius and pitch based on thread count for optimal preview
// Uses tunable parameters from settings sliders (mirrors visdev.html formulas)
function autoAdjustBraidParams() {
  const n = disk.nThreads;
  braidRadius = braidRadiusBase * Math.pow(n / 8, braidRadiusExponent);
  braidPitch = braidRadius * braidPitchRatio * Math.pow(n / 8, braidPitchExponent) * braidPitchMultiplier;
  braidVStretch = braidVStretchBase * Math.pow(n / 8, braidVStretchExponent);
  // Sync settings pitch-multiplier slider to reflect the current value
  const settingsPitchMult = document.getElementById('settings-pitch-mult');
  const settingsPitchMultVal = document.getElementById('settings-pitch-mult-val');
  if (settingsPitchMult) settingsPitchMult.value = braidPitchMultiplier;
  if (settingsPitchMultVal) settingsPitchMultVal.textContent = braidPitchMultiplier.toFixed(1);
}

// Color Presets Manager State (doc/7_UI)
let presetColors = [
  { name_ko: "레드", name_en: "Red", hex: "#FF3B30" },
  { name_ko: "오렌지", name_en: "Orange", hex: "#FF9500" },
  { name_ko: "옐로우", name_en: "Yellow", hex: "#FFCC00" },
  { name_ko: "그린", name_en: "Green", hex: "#4CD964" },
  { name_ko: "아쿠아", name_en: "Aqua", hex: "#5AC8FA" },
  { name_ko: "블루", name_en: "Blue", hex: "#007AFF" },
  { name_ko: "퍼플", name_en: "Purple", hex: "#5856D6" },
  { name_ko: "핑크", name_en: "Pink", hex: "#FF2D55" },
  { name_ko: "화이트", name_en: "White", hex: "#FFFFFF" },
  { name_ko: "다크 그레이", name_en: "Dark Gray", hex: "#1D1D1F" }
];
let editingPresetIndex = -1; // -1 for "Add New", >=0 for "Edit Existing"

// Gallery Sidebar State
let sidebarPatterns = [];
let sidebarLastDoc = null;
let sidebarLoadingMore = false;
let sidebarHasMore = true;
let sidebarActivePatternId = null;
let currentGalleryDocId = null; // Firestore doc ID of the current gallery pattern (for share URL)

// Like State
let currentUserLikes = new Set();   // pattern IDs the current user has liked (Firestore)
let anonLikes = new Set();          // pattern IDs liked by anonymous user (sessionStorage)
let currentViewedPatternId = null;  // Firestore doc ID of the pattern shown in the preview
let currentPatternLikeCount = 0;    // like count for the currently viewed pattern
let gallerySortMode = 'newest';     // 'newest' | 'mostLiked' | 'myLikes'
let myLikesOffset = 0;             // pagination offset for 'myLikes' sort mode
let myLikedPatternIds = [];         // ordered list of liked pattern IDs

// DOM Elements
const templateSelect = document.getElementById('template-select');
const templateDesc = document.getElementById('template-desc');
const metaThreads = document.getElementById('meta-threads');
const threadListContainer = document.getElementById('thread-list');
const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
const presetColorsContainer = document.getElementById('preset-colors-container');
const btnManagePresets = document.getElementById('btn-manage-presets');
const toastMessage = document.getElementById('toast-message');

// Color Popup DOM Elements
const colorPopup = document.getElementById('color-popup');
const popupPresetsContainer = document.getElementById('popup-presets');
const popupColorPicker = document.getElementById('popup-color-picker');
const popupColorHex = document.getElementById('popup-color-hex');
const popupColorName = document.getElementById('popup-color-name');
const popupSaveBtn = document.getElementById('popup-save-btn');
const popupCloseBtn = document.getElementById('popup-close');

// i18n Selector Buttons
const btnLangToggle = document.getElementById('btn-lang-toggle');
const langPopup = document.getElementById('lang-popup');
const btnLangKo = document.getElementById('btn-lang-ko');
const btnLangEn = document.getElementById('btn-lang-en');

// Modal Elements (doc/7_UI)
const presetModal = document.getElementById('preset-modal');
const modalClose = document.getElementById('modal-close');
const btnModalCloseDone = document.getElementById('btn-modal-close-done');
const modalPresetColor = document.getElementById('modal-preset-color');
const modalPresetHex = document.getElementById('modal-preset-hex');
const modalPresetName = document.getElementById('modal-preset-name');
const btnModalSave = document.getElementById('btn-modal-save');
const btnModalCancelEdit = document.getElementById('btn-modal-cancel-edit');
const modalPresetListContainer = document.getElementById('modal-preset-list');
const formTitle = document.getElementById('form-title');

const diskCanvas = document.getElementById('disk-canvas');
const braid3dContainer = document.getElementById('braid-3d-container');
const chartCanvas = document.getElementById('chart-canvas');

const stepCounter = document.getElementById('step-counter');
const guideText = document.getElementById('guide-text');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');

// Weave Button
const btnWeave = document.getElementById('btn-weave');

// Storage & Export Buttons
const authArea = document.getElementById('auth-area');
const btnSaveGallery = document.getElementById('btn-save-gallery');
const btnShareUrl = document.getElementById('btn-share-url');
const btnExportJson = document.getElementById('btn-export-json');
const btnImportJsonTrigger = document.getElementById('btn-import-json-trigger');
const inputImportJson = document.getElementById('input-import-json');
const btnExportPngChart = document.getElementById('btn-export-png-chart');
const btnExportPngBraid = document.getElementById('btn-export-png-braid');

// View switching
const tabContents = document.querySelectorAll('.tab-content');

// Canvas Contexts
const ctxDisk = diskCanvas.getContext('2d');
const ctxChart = chartCanvas.getContext('2d');

// 3D Braid Viewer
let braid3dViewer = null;
let braid3dInitPending = false;
let braid3dInitAttempts = 0;

function initBraid3DViewer() {
  if (!braid3dContainer) return;
  const nThreads = activeTemplate ? activeTemplate.threads : 8;
  // Only init if colors match thread count
  if (threadColors.length !== nThreads) return;
  // Defer if container has no dimensions yet
  if (braid3dContainer.clientWidth === 0 || braid3dContainer.clientHeight === 0) {
    if (!braid3dInitPending && braid3dInitAttempts < D3_MAX_INIT_ATTEMPTS) {
      braid3dInitPending = true;
      braid3dInitAttempts++;
      requestAnimationFrame(() => {
        braid3dInitPending = false;
        initBraid3DViewer();
      });
      setTimeout(() => {
        if (!braid3dViewer) initBraid3DViewer();
      }, 300 * braid3dInitAttempts);
    }
    return;
  }
  braid3dInitAttempts = 0;
  if (braid3dViewer) braid3dViewer.dispose();
  try {
    const pastelBg = computePastelBackground(threadColors);
    braid3dViewer = new Braid3DViewer(braid3dContainer, {
      nThreads,
      steps: d3Steps,
      tubeRadius: d3TubeRadius,
      pitchMultiplier: d3PitchMult,
      overUnder: d3OverUnder,
      interp: d3Interp,
      tubeSegments: d3TubeSeg,
      colors: [...threadColors],
      background: pastelBg,
    });
  } catch (e) {
    console.error('[3D] viewer creation failed:', e);
  }
}

// Gallery Sidebar DOM Elements
const gallerySidebar = document.querySelector('.gallery-sidebar');
const sidebarPatternList = document.getElementById('sidebar-pattern-list');
const sidebarLoadingEl = document.getElementById('sidebar-loading');
const sidebarSentinel = document.getElementById('sidebar-sentinel');
const sidebarSortSelect = document.getElementById('sidebar-sort');
const btnLike = document.getElementById('btn-like');
const previewLikeCount = document.getElementById('preview-like-count');

// --- Auth UI ---
const GOOGLE_ICON_SVG = `<svg class="google-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.81-4.59l-7.98-6.19A23.93 23.93 0 0 0 0 24c0 3.77.9 7.35 2.56 10.59l7.97-6zm"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function updateAuthUI(user) {
  const t = TRANSLATIONS[currentLang];
  if (user) {
    authArea.innerHTML = `
      <div class="auth-user-info">
        <img src="${user.photoURL || ''}" alt="avatar" class="auth-avatar" referrerpolicy="no-referrer">
        <span class="auth-display-name">${user.displayName || user.email}</span>
      </div>
      <button class="btn-signout" id="btn-signout">${t.signOut}</button>
    `;
    authArea.querySelector('#btn-signout').addEventListener('click', () => {
      signOutUser();
    });
  } else {
    authArea.innerHTML = `
      <button class="btn-google-signin" id="btn-google-signin">
        ${GOOGLE_ICON_SVG} ${t.signInWithGoogle}
      </button>
    `;
    authArea.querySelector('#btn-google-signin').addEventListener('click', () => {
      signInWithGoogle();
    });
  }
}

// --- Initialization ---
function init() {
  loadAnonLikes();

  // Auth state listener
  onAuthChange((user) => {
    currentUser = user;
    updateAuthUI(user);
    if (user) {
      loadUserColorsFromFirestore();
      loadUserLikes();
    } else {
      currentUserLikes = new Set();
      updateLikeUI();
    }
  });

  // Load custom color presets from localStorage if saved (doc/7_UI)
  const localPresets = localStorage.getItem('palzzi-custom-presets');
  if (localPresets) {
    try {
      presetColors = JSON.parse(localPresets);
    } catch (e) {
      console.error("Error loading custom presets from storage:", e);
    }
  }

  // Set the default language to English (as requested by user)
  setLanguage('en');

  setupTemplateDropdown();
  loadTemplate(activeTemplate);
  setupEventListeners();
  const urlHadStep = checkUrlParams();

  if (!urlHadStep) {
    while (currentStep < MAX_STEPS) {
      disk.weaveRowFast();
      currentStep = disk.rowIndex;
    }
    updatePlaybackUI();
  }

  // Render initially
  renderPresetColors();
  renderAll();

  // Inject AdSense ads (IDs from .env via import.meta.env)
  initAdSense();
  injectPlaybackAd(document.querySelector('.workspace-center'));

  // Gallery sidebar: setup scroll container first, then load first page
  setupSidebarInfiniteScroll();
  loadGalleryPage();
}

// i18n Translation Engine Changer
function setLanguage(lang) {
  currentLang = lang;
  
  // Update browser document title
  document.title = TRANSLATIONS[lang].title;

  // Toggle active styling on pills
  if (lang === 'ko') {
    btnLangKo.classList.add('active');
    btnLangEn.classList.remove('active');
  } else {
    btnLangEn.classList.add('active');
    btnLangKo.classList.remove('active');
  }
  langPopup.classList.add('hidden');

  // Translate all tags carrying data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang][key]) {
      // Preserve icon elements if they exist inside buttons
      const icon = el.querySelector('i');
      if (icon) {
        // Find text nodes or span
        const span = el.querySelector('span');
        if (span) {
          span.textContent = TRANSLATIONS[lang][key];
        } else {
          el.innerHTML = `${icon.outerHTML} ${TRANSLATIONS[lang][key]}`;
        }
      } else {
        el.textContent = TRANSLATIONS[lang][key];
      }
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (TRANSLATIONS[lang][key]) {
      el.setAttribute('placeholder', TRANSLATIONS[lang][key]);
    }
  });

  // Reload Template Dropdown text & metadata description dynamically
  setupTemplateDropdown();
  updateTemplateDisplayMetadata();
  updatePlaybackUI();
  updateLikeUI();

  // Re-render preset colors with updated language
  renderPresetColors();
}

// Populate templates into select dropdown with current language translations
function setupTemplateDropdown() {
  const currentVal = templateSelect.value || activeTemplate.id;
  templateSelect.innerHTML = '';
  
  KUMIHIMO_TEMPLATES.forEach(tmpl => {
    const opt = document.createElement('option');
    opt.value = tmpl.id;
    // Fallback to name_en if name_ko/en is missing
    opt.textContent = currentLang === 'ko' ? tmpl.name_ko : tmpl.name_en;
    templateSelect.appendChild(opt);
  });
  templateSelect.value = currentVal;
}

// Update active template info section (called on lang change and template load)
function updateTemplateDisplayMetadata() {
  if (!activeTemplate) return;
  
  templateDesc.textContent = currentLang === 'ko' ? activeTemplate.desc_ko : activeTemplate.desc_en;
  
  metaThreads.innerHTML = `<i class="fa-solid fa-braille"></i> ${activeTemplate.threads}${TRANSLATIONS[currentLang].metaThreads}`;
}

// Load selected template
function loadTemplate(tmpl, customColors = null) {
  activeTemplate = tmpl;
  disk = new KumihimoDisk(tmpl.threads);
  threadColors = customColors ? [...customColors] : [...tmpl.defaultColors];
  
  currentStep = 0;
  if (progressBar) {
    progressBar.max = MAX_STEPS;
    progressBar.value = 0;
  }
  
  selectedThreadIndex = 0; // Default to first thread
  
  // Reset engine disk state
  resetSimulationToStep(currentStep);

  // Auto-adjust braid preview params based on thread count
  autoAdjustBraidParams();

  // Update UI Elements and translations
  updateTemplateDisplayMetadata();
  
  // Refresh color controls list
  populateThreadList();
  updateColorPickerUI();
}

// Reset and weave up to a specific step
function resetSimulationToStep(step) {
  disk.reset(threadColors);
  for (let i = 0; i < step; i++) {
    try {
      disk.weaveRowFast();
    } catch (err) {
      console.error(`Error reconstructing state at step ${i + 1}:`, err);
      break;
    }
  }
  currentStep = disk.rowIndex;
  updatePlaybackUI();
}

// Refresh active threads colors list on the left panel
function populateThreadList() {
  if (!threadListContainer) return;
  threadListContainer.innerHTML = '';
  for (let i = 0; i < threadColors.length; i++) {
    const item = document.createElement('div');
    item.className = `thread-item ${i === selectedThreadIndex ? 'selected' : ''}`;
    item.dataset.index = i;
    
    const dot = document.createElement('div');
    dot.className = 'thread-dot';
    dot.style.backgroundColor = threadColors[i];
    
    const num = document.createElement('span');
    num.className = 'thread-num';
    num.textContent = currentLang === 'ko' ? `실 ${i + 1}` : `Th. ${i + 1}`;
    
    item.appendChild(dot);
    item.appendChild(num);
    
    item.addEventListener('click', () => {
      selectedThreadIndex = i;
      document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      updateColorPickerUI();
      renderAll();
    });
    
    threadListContainer.appendChild(item);
  }
}

function updateColorPickerUI() {
  if (!colorPicker || !colorHex) return;
  if (selectedThreadIndex >= 0 && selectedThreadIndex < threadColors.length) {
    const color = threadColors[selectedThreadIndex];
    colorPicker.value = color;
    colorHex.value = color;
  }
}

function updatePlaybackUI() {
  if (stepCounter) stepCounter.textContent = `${TRANSLATIONS[currentLang].stepCounterPrefix} ${currentStep} / ${MAX_STEPS}`;
  if (progressBar) progressBar.value = currentStep;
  if (progressPercentage) progressPercentage.textContent = `${Math.round((currentStep / MAX_STEPS) * 100)}%`;
}

// --- Renderers ---

function renderAll() {
  drawDisk();
  updateBraid3D();
  drawChart();
}

function updateBraid3D() {
  const nThreads = activeTemplate ? activeTemplate.threads : 8;
  if (threadColors.length !== nThreads) return;
  if (!braid3dViewer) {
    initBraid3DViewer();
    return;
  }
  braid3dViewer.update({
    nThreads,
    steps: d3Steps,
    tubeRadius: d3TubeRadius,
    pitchMultiplier: d3PitchMult,
    overUnder: d3OverUnder,
    interp: d3Interp,
    tubeSegments: d3TubeSeg,
    colors: [...threadColors],
  });
  // Set pastel background based on thread colors
  const pastelBg = computePastelBackground(threadColors);
  braid3dViewer.scene.background = new THREE.Color(pastelBg);
}

/**
 * Draw Circular slots Kumihimo Disk (scales dynamically based on slotsCount)
 */
function drawDisk() {
  ctxDisk.clearRect(0, 0, diskCanvas.width, diskCanvas.height);
  
  const cx = diskCanvas.width / 2;
  const cy = diskCanvas.height / 2;
  const rDisk = 180;
  const rInner = 40;
  
  // 1. Draw Disk Outer Shadow & Circle
  ctxDisk.beginPath();
  ctxDisk.arc(cx, cy, rDisk, 0, 2 * Math.PI);
  ctxDisk.fillStyle = '#f0ebe1'; // Foam material color
  ctxDisk.shadowColor = 'rgba(0,0,0,0.1)';
  ctxDisk.shadowBlur = 10;
  ctxDisk.shadowOffsetY = 4;
  ctxDisk.fill();
  ctxDisk.shadowColor = 'transparent'; // Reset shadow
  ctxDisk.lineWidth = 4;
  ctxDisk.strokeStyle = '#d9d0c1';
  ctxDisk.stroke();
  
  // Draw Decorative Disk Inner Rings
  ctxDisk.beginPath();
  ctxDisk.arc(cx, cy, rDisk - 25, 0, 2 * Math.PI);
  ctxDisk.strokeStyle = 'rgba(0,0,0,0.03)';
  ctxDisk.lineWidth = 1;
  ctxDisk.stroke();

  // 2. Draw slots (notches) and slot numbers based on slotsCount
  for (let i = 0; i < disk.slotsCount; i++) {
    // Math: slot 1 is at 12 o'clock, which is -Math.PI / 2.
    const angle = (i * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Notch dimensions
    const xOuter = cx + rDisk * cos;
    const yOuter = cy + rDisk * sin;
    const xInner = cx + (rDisk - 15) * cos;
    const yInner = cy + (rDisk - 15) * sin;
    
    // Draw notch line
    ctxDisk.beginPath();
    ctxDisk.moveTo(xInner, yInner);
    ctxDisk.lineTo(xOuter, yOuter);
    ctxDisk.strokeStyle = '#9e927c';
    ctxDisk.lineWidth = 3;
    ctxDisk.stroke();
    
    // Write Slot Numbers (1 to slotsCount)
    const textR = rDisk - 32;
    const tx = cx + textR * cos;
    const ty = cy + textR * sin;
    
    ctxDisk.save();
    ctxDisk.translate(tx, ty);
    // Align text rotation to be radial
    ctxDisk.rotate(angle + Math.PI / 2);
    ctxDisk.fillStyle = '#4a3f2c';
    ctxDisk.font = disk.slotsCount > 32 ? 'bold 9px sans-serif' : 'bold 11px sans-serif'; // slightly smaller font for 64 slots
    ctxDisk.textAlign = 'center';
    ctxDisk.textBaseline = 'middle';
    ctxDisk.fillText(i + 1, 0, 0);
    ctxDisk.restore();
  }
  
  // 3. Draw Center hole (where the woven cord goes down)
  ctxDisk.beginPath();
  ctxDisk.arc(cx, cy, rInner, 0, 2 * Math.PI);
  ctxDisk.fillStyle = '#1a1a1a'; // Deep hole
  ctxDisk.fill();
  ctxDisk.lineWidth = 3;
  ctxDisk.strokeStyle = '#d9d0c1';
  ctxDisk.stroke();

  // Draw a braided core in the center for aesthetic touch
  ctxDisk.beginPath();
  ctxDisk.arc(cx, cy, rInner - 8, 0, 2 * Math.PI);
  ctxDisk.fillStyle = '#2d2d30';
  ctxDisk.fill();

  // Draw some braided lines in the core
  ctxDisk.strokeStyle = 'rgba(255,255,255,0.1)';
  ctxDisk.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * 2 * Math.PI) / 8;
    ctxDisk.beginPath();
    ctxDisk.moveTo(cx, cy);
    ctxDisk.lineTo(cx + (rInner - 8) * Math.cos(a), cy + (rInner - 8) * Math.sin(a));
    ctxDisk.stroke();
  }

  // 4. Draw Threads (Lines from slot to center)
  for (let i = 0; i < disk.slotsCount; i++) {
    const thread = disk.state[i];
    
    // Skip empty slots
    if (!thread) continue;
    
    const threadColor = thread.color;
    
    const angle = (i * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const xSlot = cx + (rDisk - 15) * cos;
    const ySlot = cy + (rDisk - 15) * sin;
    const xCore = cx + (rInner - 12) * cos;
    const yCore = cy + (rInner - 12) * sin;
    
    // Draw thick thread line with nice shadows
    ctxDisk.save();
    ctxDisk.beginPath();
    ctxDisk.moveTo(xSlot, ySlot);
    ctxDisk.lineTo(xCore, yCore);
    ctxDisk.strokeStyle = threadColor;
    ctxDisk.lineWidth = disk.slotsCount > 32 ? 6 : 8; // slightly thinner for 64 slots
    ctxDisk.lineCap = 'round';
    
    // Drop shadow on thread for richness
    ctxDisk.shadowColor = 'rgba(0,0,0,0.2)';
    ctxDisk.shadowBlur = 3;
    ctxDisk.shadowOffsetY = 2;
    ctxDisk.stroke();
    ctxDisk.restore();

    // Inner stripe of thread for realistic fiber look
    ctxDisk.beginPath();
    ctxDisk.moveTo(xSlot, ySlot);
    ctxDisk.lineTo(xCore, yCore);
    ctxDisk.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctxDisk.lineWidth = 2;
    ctxDisk.stroke();
    
    // Draw terminal bulb (thread knob at notch)
    ctxDisk.beginPath();
    ctxDisk.arc(xSlot, ySlot, disk.slotsCount > 32 ? 7 : 10, 0, 2 * Math.PI); // smaller knobs for 64 slots
    ctxDisk.fillStyle = threadColor;
    ctxDisk.fill();
    ctxDisk.lineWidth = 2;
    ctxDisk.strokeStyle = '#ffffff';
    ctxDisk.stroke();

    // Check if this thread is selected for color editing
    // We map disk slot to original thread list index
    const isSelected = isThreadSelectedAtSlot(i);
    if (isSelected) {
      ctxDisk.beginPath();
      ctxDisk.arc(xSlot, ySlot, disk.slotsCount > 32 ? 10 : 14, 0, 2 * Math.PI);
      ctxDisk.strokeStyle = varColor('--primary-color', '#007aff');
      ctxDisk.lineWidth = 3;
      ctxDisk.stroke();
    }
  }

  // 5. Draw Active Guided Animation Arrows (only if we can weave further)
  if (currentStep < MAX_STEPS) {
    const nPairs = disk.nThreads / 2;
    const distance = disk.slotsCount / nPairs;
    const startPos = (disk.slotsCount - disk.rowIndex) % disk.slotsCount;
    
    // Show active step's arrows
    const tl = startPos;
    const tr = (startPos + 1) % disk.slotsCount;
    const br = (startPos + (disk.slotsCount / 2)) % disk.slotsCount;
    const bl = (br + 1) % disk.slotsCount;
    
    // Guide 1: TR -> BR - 1
    const targetBr = (br - 1 + disk.slotsCount) % disk.slotsCount;
    drawActiveArrow(tr, targetBr, '#007aff', 'TR');
    
    // Guide 2: BL -> TL - 1
    const targetTl = (tl - 1 + disk.slotsCount) % disk.slotsCount;
    drawActiveArrow(bl, targetTl, '#34c759', 'BL');
  }
}

// Check if a slot currently holds the selected thread (uses disk.state, not initial positions)
function isThreadSelectedAtSlot(slotIdx) {
  const thread = disk.state[slotIdx];
  return thread && thread.id === selectedThreadIndex;
}

// Draw Curved Arrow Guide between slots
function drawActiveArrow(fromIdx, toIdx, color, label) {
  const cx = diskCanvas.width / 2;
  const cy = diskCanvas.height / 2;
  const rDisk = 180;
  
  const fromAngle = (fromIdx * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
  const toAngle = (toIdx * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
  
  const fx = cx + (rDisk - 30) * Math.cos(fromAngle);
  const fy = cy + (rDisk - 30) * Math.sin(fromAngle);
  
  const tx = cx + (rDisk - 25) * Math.cos(toAngle);
  const ty = cy + (rDisk - 25) * Math.sin(toAngle);
  
  // Control point for quadratic curve to bow inwards
  const mx = cx + (rDisk - 70) * Math.cos((fromAngle + toAngle) / 2);
  const my = cy + (rDisk - 70) * Math.sin((fromAngle + toAngle) / 2);
  
  ctxDisk.save();
  ctxDisk.beginPath();
  ctxDisk.moveTo(fx, fy);
  ctxDisk.quadraticCurveTo(mx, my, tx, ty);
  ctxDisk.strokeStyle = color;
  ctxDisk.lineWidth = 3;
  ctxDisk.setLineDash([5, 5]);
  ctxDisk.stroke();
  
  // Draw Arrow Head
  const angleAtEnd = Math.atan2(ty - my, tx - mx);
  ctxDisk.beginPath();
  ctxDisk.moveTo(tx, ty);
  ctxDisk.lineTo(tx - 12 * Math.cos(angleAtEnd - Math.PI / 6), ty - 12 * Math.sin(angleAtEnd - Math.PI / 6));
  ctxDisk.lineTo(tx - 12 * Math.cos(angleAtEnd + Math.PI / 6), ty - 12 * Math.sin(angleAtEnd + Math.PI / 6));
  ctxDisk.closePath();
  ctxDisk.fillStyle = color;
  ctxDisk.fill();
  
  // Guide Indicator Badge in the middle of the line
  const midX = 0.25 * fx + 0.5 * mx + 0.25 * tx;
  const midY = 0.25 * fy + 0.5 * my + 0.25 * ty;
  ctxDisk.beginPath();
  ctxDisk.arc(midX, midY, 10, 0, 2 * Math.PI);
  ctxDisk.fillStyle = color;
  ctxDisk.fill();
  ctxDisk.fillStyle = '#ffffff';
  ctxDisk.font = 'bold 9px sans-serif';
  ctxDisk.textAlign = 'center';
  ctxDisk.textBaseline = 'middle';
  ctxDisk.fillText(label, midX, midY);
  ctxDisk.restore();
}

// Adjust HEX color brightness by a factor (0.0 to 1.0) for 3D depth lighting without gray 칙칙함
function adjustColorBrightness(hex, factor) {
  // Ensure valid hex format
  if (!hex || hex.charAt(0) !== '#') return hex;
  
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  
  r = Math.round(r * factor);
  g = Math.round(g * factor);
  b = Math.round(b * factor);
  
  const toHex = (c) => {
    const h = Math.max(0, Math.min(255, c)).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Draw Interactive Pattern Chart
 */
function drawChart() {
  ctxChart.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const nThreads = disk.nThreads;
  
  // Background
  ctxChart.fillStyle = '#ffffff';
  ctxChart.fillRect(0, 0, width, height);
  
  // Set dimensions based on thread counts
  const cellWidth = Math.floor((width - 40) / nThreads);
  const cellHeight = 15;
  const offsetX = 30; // Margin left for step numbers
  const offsetY = 20; // Margin top
  
  // Dynamically size chart canvas height if MAX_STEPS is large
  const requiredHeight = MAX_STEPS * cellHeight + offsetY + 30;
  if (chartCanvas.height !== requiredHeight) {
    chartCanvas.height = requiredHeight;
  }
  
  // 1. Draw grid headers (Thread index labels)
  ctxChart.fillStyle = '#86868b';
  ctxChart.font = 'bold 9px monospace';
  ctxChart.textAlign = 'center';
  ctxChart.textBaseline = 'middle';
  
  for (let c = 0; c < nThreads; c++) {
    const x = offsetX + c * cellWidth + cellWidth / 2;
    ctxChart.fillText(`T${c+1}`, x, offsetY - 8);
  }
  
  // 2. Draw historical rows + future rows
  for (let r = 0; r < MAX_STEPS; r++) {
    const y = offsetY + r * cellHeight;
    
    // Draw Row step number on the left
    ctxChart.fillStyle = '#86868b';
    ctxChart.font = '9px monospace';
    ctxChart.textAlign = 'right';
    ctxChart.fillText(`${r+1}`, offsetX - 6, y + cellHeight/2);
    
    // Get row colors at this step
    const row = disk.product[r];
    
    for (let c = 0; c < nThreads; c++) {
      const x = offsetX + c * cellWidth;
      
      if (row && row[c]) {
        // Weaved historical cell
        ctxChart.fillStyle = row[c];
        ctxChart.fillRect(x, y, cellWidth - 1, cellHeight - 1);
        
        // Soft border
        ctxChart.strokeStyle = 'rgba(0,0,0,0.06)';
        ctxChart.lineWidth = 0.5;
        ctxChart.strokeRect(x, y, cellWidth - 1, cellHeight - 1);
      } else {
        // Future/Unweaved grid slot
        ctxChart.fillStyle = '#fafafa';
        ctxChart.fillRect(x, y, cellWidth - 1, cellHeight - 1);
        ctxChart.strokeStyle = '#e5e5ea';
        ctxChart.lineWidth = 0.5;
        ctxChart.strokeRect(x, y, cellWidth - 1, cellHeight - 1);
      }
    }
  }
  
  // 3. Highlight current step pointer
  if (currentStep > 0 && currentStep <= MAX_STEPS) {
    const activeY = offsetY + (currentStep - 1) * cellHeight;
    
    // Highlight border around active row
    ctxChart.strokeStyle = '#ff3b30';
    ctxChart.lineWidth = 2;
    ctxChart.strokeRect(offsetX - 2, activeY - 1, nThreads * cellWidth + 2, cellHeight + 1);
    
    // Add small red pointer arrow on the left
    ctxChart.beginPath();
    ctxChart.moveTo(offsetX - 14, activeY + cellHeight/2 - 4);
    ctxChart.lineTo(offsetX - 6, activeY + cellHeight/2);
    ctxChart.lineTo(offsetX - 14, activeY + cellHeight/2 + 4);
    ctxChart.closePath();
    ctxChart.fillStyle = '#ff3b30';
    ctxChart.fill();
  }
}

// Utility to read CSS variable
function varColor(name, fallback) {
  const color = getComputedStyle(document.documentElement).getPropertyValue(name);
  return color ? color.trim() : fallback;
}

// --- Interaction Logic & Drag Drop ---

// Map mouse click to disk notches to see if a thread bulb was clicked
function getThreadIndexFromCoords(mx, my) {
  const cx = diskCanvas.width / 2;
  const cy = diskCanvas.height / 2;
  const rDisk = 180;
  
  // Map clicked coordinates
  for (let i = 0; i < disk.slotsCount; i++) {
    const thread = disk.state[i];
    if (!thread) continue;
    
    const angle = (i * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
    const xSlot = cx + (rDisk - 15) * Math.cos(angle);
    const ySlot = cy + (rDisk - 15) * Math.sin(angle);
    
    // Distance check
    const dist = Math.hypot(mx - xSlot, my - ySlot);
    if (dist < 15) {
      return i; // Return active slot index (0 to slotsCount-1)
    }
  }
  return -1;
}

// Convert slot index on disk to original colors panel thread index (0 to nThreads-1)
// Map a disk slot to the thread color index — uses current disk.state (accounts for weaving rotation)
function mapDiskSlotToThreadColorIdx(slotIdx) {
  const thread = disk.state[slotIdx];
  return thread ? thread.id : -1;
}

// Show temporary feedback toast message
function showToast(msg) {
  toastMessage.textContent = msg;
  toastMessage.classList.remove('hidden');
  setTimeout(() => {
    toastMessage.classList.add('hidden');
  }, 2500);
}

// Update the selected thread's color and re-render
function updateSelectedThreadColor(color) {
  if (selectedThreadIndex >= 0 && selectedThreadIndex < threadColors.length) {
    threadColors[selectedThreadIndex] = color;
    if (threadListContainer) populateThreadList();
    if (colorPicker || colorHex) updateColorPickerUI();
    resetSimulationToStep(currentStep);
    renderAll();
    saveUserColorsToFirestore();
}
}

// --- Color Popup Logic ---
function showColorPopup(clientX, clientY) {
  if (!colorPopup) return;

  // Populate preset circles
  popupPresetsContainer.innerHTML = '';
  presetColors.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'popup-preset-btn';
    btn.style.backgroundColor = preset.hex;
    btn.title = `${getPresetName(preset)} (${preset.hex})`;
    btn.addEventListener('click', () => {
      updateSelectedThreadColor(preset.hex);
      hideColorPopup();
      showToast(TRANSLATIONS[currentLang].toastColorApplied);
    });
    popupPresetsContainer.appendChild(btn);
  });

  // Sync color picker to current thread color
  if (selectedThreadIndex >= 0 && selectedThreadIndex < threadColors.length) {
    popupColorPicker.value = threadColors[selectedThreadIndex];
    popupColorHex.value = threadColors[selectedThreadIndex];
  }
  popupColorName.value = '';

  // Position popup near the click
  const container = diskCanvas.parentElement;
  const containerRect = container.getBoundingClientRect();
  const popupWidth = 180;
  const popupMaxHeight = 320;

  let left = clientX - containerRect.left + 12;
  let top = clientY - containerRect.top - 10;

  // Keep popup within container bounds
  if (left + popupWidth > containerRect.width) {
    left = containerRect.width - popupWidth - 8;
  }
  if (left < 8) left = 8;
  if (top + popupMaxHeight > containerRect.height) {
    top = containerRect.height - popupMaxHeight - 8;
  }
  if (top < 8) top = 8;

  colorPopup.style.left = left + 'px';
  colorPopup.style.top = top + 'px';
  colorPopup.classList.remove('hidden');
}

function hideColorPopup() {
  if (colorPopup) colorPopup.classList.add('hidden');
}

// --- Events Setup ---
function setupEventListeners() {

  // Settings Modal Controls
  const settingsBtn = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsClose = document.getElementById('settings-close');

  // Color Popup event handlers
  if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', hideColorPopup);
  }

  if (popupColorPicker) {
    popupColorPicker.addEventListener('input', (e) => {
      const newColor = e.target.value;
      if (popupColorHex) popupColorHex.value = newColor;
      updateSelectedThreadColor(newColor);
      renderAll();
    });
  }

  if (popupColorHex) {
    popupColorHex.addEventListener('change', (e) => {
      let newColor = e.target.value.trim();
      if (/^#[0-9A-F]{6}$/i.test(newColor)) {
        if (popupColorPicker) popupColorPicker.value = newColor;
        updateSelectedThreadColor(newColor);
        renderAll();
      } else {
        showToast(currentLang === 'ko' ? "올바른 HEX 컬러 코드를 입력해주세요. (예: #FF5733)" : "Please enter a valid HEX code (e.g., #FF5733)");
      }
    });
  }

  if (popupSaveBtn) {
    popupSaveBtn.addEventListener('click', () => {
      const name = popupColorName.value.trim();
      const hex = popupColorHex.value.trim();
      if (!name) {
        showToast(currentLang === 'ko' ? "색상 이름을 입력해주세요." : "Please enter a color name.");
        return;
      }
      if (!/^#[0-9A-F]{6}$/i.test(hex)) {
        showToast(currentLang === 'ko' ? "올바른 HEX 코드를 입력해주세요." : "Please enter a valid HEX code.");
        return;
      }
      const preset = { name_ko: name, name_en: name, hex };
      presetColors.push(preset);
      savePresetsToStorage();
      renderPresetColors();
      showToast(TRANSLATIONS[currentLang].toastPresetSaved);
      // Refresh popup preset list
      popupPresetsContainer.innerHTML = '';
      presetColors.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'popup-preset-btn';
        btn.style.backgroundColor = preset.hex;
        btn.title = `${getPresetName(preset)} (${preset.hex})`;
        btn.addEventListener('click', () => {
          updateSelectedThreadColor(preset.hex);
          hideColorPopup();
          showToast(TRANSLATIONS[currentLang].toastColorApplied);
        });
        popupPresetsContainer.appendChild(btn);
      });
    });
  }

  // Close popup when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (colorPopup && !colorPopup.classList.contains('hidden') && !colorPopup.contains(e.target) && e.target !== diskCanvas) {
      hideColorPopup();
    }
  });

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });
  }
  if (settingsClose) {
    settingsClose.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
  }

  // Export Dropdown
  const exportDropdownBtn = document.getElementById('btn-export-dropdown');
  const exportDropdownMenu = document.getElementById('export-dropdown-menu');
  if (exportDropdownBtn) {
    exportDropdownBtn.addEventListener('click', () => {
      exportDropdownMenu.classList.toggle('hidden');
    });
  }
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (exportDropdownMenu && !exportDropdownMenu.classList.contains('hidden') &&
        !e.target.closest('#btn-export-dropdown') && !e.target.closest('#export-dropdown-menu')) {
      exportDropdownMenu.classList.add('hidden');
    }
  });

  // Settings: 3D Tube Radius
  const settings3DTubeRadius = document.getElementById('settings-3d-tube-radius');
  const settings3DTubeRadiusVal = document.getElementById('settings-3d-tube-radius-val');
  if (settings3DTubeRadius) {
    settings3DTubeRadius.value = D3_TUBE_RADIUS;
    if (settings3DTubeRadiusVal) settings3DTubeRadiusVal.textContent = D3_TUBE_RADIUS.toFixed(2);
    settings3DTubeRadius.addEventListener('input', (e) => {
      d3TubeRadius = parseFloat(e.target.value);
      if (settings3DTubeRadiusVal) settings3DTubeRadiusVal.textContent = d3TubeRadius.toFixed(2);
      updateBraid3D();
    });
  }

  // Settings: 3D Pitch Multiplier
  const settings3DPitchMult = document.getElementById('settings-3d-pitch-mult');
  const settings3DPitchMultVal = document.getElementById('settings-3d-pitch-mult-val');
  if (settings3DPitchMult) {
    settings3DPitchMult.value = D3_PITCH_MULT;
    if (settings3DPitchMultVal) settings3DPitchMultVal.textContent = D3_PITCH_MULT.toFixed(1);
    settings3DPitchMult.addEventListener('input', (e) => {
      d3PitchMult = parseFloat(e.target.value);
      if (settings3DPitchMultVal) settings3DPitchMultVal.textContent = d3PitchMult.toFixed(1);
      updateBraid3D();
    });
  }

  // Settings: 3D Steps
  const settings3DSteps = document.getElementById('settings-3d-steps');
  const settings3DStepsVal = document.getElementById('settings-3d-steps-val');
  if (settings3DSteps) {
    settings3DSteps.value = D3_STEPS;
    if (settings3DStepsVal) settings3DStepsVal.textContent = D3_STEPS;
    settings3DSteps.addEventListener('input', (e) => {
      d3Steps = parseInt(e.target.value, 10);
      if (settings3DStepsVal) settings3DStepsVal.textContent = d3Steps;
      updateBraid3D();
    });
  }

  // Settings: 3D Over/Under Height
  const settings3DOverUnder = document.getElementById('settings-3d-overunder');
  const settings3DOverUnderVal = document.getElementById('settings-3d-overunder-val');
  if (settings3DOverUnder) {
    settings3DOverUnder.value = D3_OVER_UNDER;
    if (settings3DOverUnderVal) settings3DOverUnderVal.textContent = D3_OVER_UNDER.toFixed(2);
    settings3DOverUnder.addEventListener('input', (e) => {
      d3OverUnder = parseFloat(e.target.value);
      if (settings3DOverUnderVal) settings3DOverUnderVal.textContent = d3OverUnder.toFixed(2);
      updateBraid3D();
    });
  }

  // Settings: 3D Interpolation
  const settings3DInterp = document.getElementById('settings-3d-interp');
  const settings3DInterpVal = document.getElementById('settings-3d-interp-val');
  if (settings3DInterp) {
    settings3DInterp.value = D3_INTERP;
    if (settings3DInterpVal) settings3DInterpVal.textContent = D3_INTERP;
    settings3DInterp.addEventListener('input', (e) => {
      d3Interp = parseInt(e.target.value, 10);
      if (settings3DInterpVal) settings3DInterpVal.textContent = d3Interp;
      updateBraid3D();
    });
  }

  // Settings: 3D Tube Segments
  const settings3DTubeSeg = document.getElementById('settings-3d-tube-seg');
  const settings3DTubeSegVal = document.getElementById('settings-3d-tube-seg-val');
  if (settings3DTubeSeg) {
    settings3DTubeSeg.value = D3_TUBE_SEG;
    if (settings3DTubeSegVal) settings3DTubeSegVal.textContent = D3_TUBE_SEG;
    settings3DTubeSeg.addEventListener('input', (e) => {
      d3TubeSeg = parseInt(e.target.value, 10);
      if (settings3DTubeSegVal) settings3DTubeSegVal.textContent = d3TubeSeg;
      updateBraid3D();
    });
  }

  // Settings: Reset 3D Rendering Parameters
  const btnReset3DRender = document.getElementById('btn-reset-3d-render');
  if (btnReset3DRender) {
    btnReset3DRender.addEventListener('click', () => {
      d3TubeRadius = D3_TUBE_RADIUS;
      d3PitchMult = D3_PITCH_MULT;
      d3Steps = D3_STEPS;
      d3OverUnder = D3_OVER_UNDER;
      d3Interp = D3_INTERP;
      d3TubeSeg = D3_TUBE_SEG;
      const syncMap = [
        ['settings-3d-tube-radius', 'settings-3d-tube-radius-val', D3_TUBE_RADIUS, v => v.toFixed(2)],
        ['settings-3d-pitch-mult', 'settings-3d-pitch-mult-val', D3_PITCH_MULT, v => v.toFixed(1)],
        ['settings-3d-steps', 'settings-3d-steps-val', D3_STEPS, v => String(v)],
        ['settings-3d-overunder', 'settings-3d-overunder-val', D3_OVER_UNDER, v => v.toFixed(2)],
        ['settings-3d-interp', 'settings-3d-interp-val', D3_INTERP, v => String(v)],
        ['settings-3d-tube-seg', 'settings-3d-tube-seg-val', D3_TUBE_SEG, v => String(v)],
      ];
      syncMap.forEach(([sid, vid, val, fmt]) => {
        const s = document.getElementById(sid);
        const v = document.getElementById(vid);
        if (s) s.value = val;
        if (v) v.textContent = fmt(val);
      });
      updateBraid3D();
    });
  }


  // i18n Language toggle clicks
  btnLangToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    langPopup.classList.toggle('hidden');
  });
  btnLangKo.addEventListener('click', () => setLanguage('ko'));
  btnLangEn.addEventListener('click', () => setLanguage('en'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#lang-selector')) {
      langPopup.classList.add('hidden');
    }
  });

  // Preset Manager Modal Control (doc/7_UI)
  if (btnManagePresets) {
    btnManagePresets.addEventListener('click', () => {
      presetModal.classList.remove('hidden');
      renderModalPresetList();
      cancelEditPreset();
    });
  }

  const closeModalFunc = () => {
    presetModal.classList.add('hidden');
  };

  modalClose.addEventListener('click', closeModalFunc);
  btnModalCloseDone.addEventListener('click', closeModalFunc);
  
  presetModal.addEventListener('click', (e) => {
    if (e.target === presetModal) {
      closeModalFunc();
    }
  });

  // Modal Color Picker -> HEX Sync
  modalPresetColor.addEventListener('input', (e) => {
    modalPresetHex.value = e.target.value;
  });

  // Modal HEX Text -> Color Picker Sync
  modalPresetHex.addEventListener('input', (e) => {
    const hex = e.target.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      modalPresetColor.value = hex;
    }
  });

  // Modal Form Actions
  btnModalSave.addEventListener('click', savePreset);
  btnModalCancelEdit.addEventListener('click', cancelEditPreset);
  
  // 1. Template dropdown change
  templateSelect.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    const tmpl = KUMIHIMO_TEMPLATES.find(t => t.id === selectedId);
    if (tmpl) {
      loadTemplate(tmpl);
      renderAll();
      showToast(currentLang === 'ko' ? `${tmpl.name_ko} 로드됨` : `${tmpl.name_en} loaded`);
    }
  });

  // 2. Color customizer change
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      const newColor = e.target.value;
      if (colorHex) colorHex.value = newColor;
      updateSelectedThreadColor(newColor);
    });
  }

  if (colorHex) {
    colorHex.addEventListener('change', (e) => {
      let newColor = e.target.value.trim();
      if (/^#[0-9A-F]{6}$/i.test(newColor)) {
        if (colorPicker) colorPicker.value = newColor;
        updateSelectedThreadColor(newColor);
      } else {
        showToast(currentLang === 'ko' ? "올바른 HEX 컬러 코드를 입력해주세요. (예: #FF5733)" : "Please enter a valid HEX code (e.g., #FF5733)");
      }
    });
  }

  // Preset color buttons - 이벤트 리스너는 renderPresetColors() 함수에서 동적으로 추가됨

  // 3. Weave Button — simulate all rows at once
  if (btnWeave) {
    btnWeave.addEventListener('click', () => {
      btnWeave.disabled = true;
      btnWeave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Weaving...';
      try {
        while (currentStep < MAX_STEPS) {
          disk.weaveRowFast();
          currentStep = disk.rowIndex;
        }
        updatePlaybackUI();
        renderAll();
      } catch (err) {
        showToast(`${currentLang === 'ko' ? '오류' : 'Error'}: ${err.message}`);
      }
      btnWeave.disabled = false;
      btnWeave.innerHTML = '<i class="fa-solid fa-arrows-spin"></i> Weave';
    });
  }

  // 4. Storage actions

  // Save to Firebase Gallery (Firestore) — requires auth
  btnSaveGallery.addEventListener('click', async () => {
    const t = TRANSLATIONS[currentLang];

    if (!currentUser) {
      showToast(t.signInRequired);
      return;
    }

    btnSaveGallery.disabled = true;

    try {
      const defaultName = currentLang === 'ko'
        ? (activeTemplate.name_ko || activeTemplate.name_en)
        : (activeTemplate.name_en || activeTemplate.name_ko);
      const userInput = prompt(t.savePatternPrompt, defaultName);
      if (userInput === null) {
        btnSaveGallery.disabled = false;
        return;
      }
      const patternName = userInput.trim() || defaultName;

      // Capture 3D braid snapshot for gallery/sidebar preview
      let snapshotBase64 = '';
      if (braid3dViewer && braid3dViewer.braidGroup) {
        // Wait one frame so the latest build is rendered
        await new Promise(r => requestAnimationFrame(r));
        // Temporarily set pastel background for snapshot
        const origBg = braid3dViewer.scene.background.clone();
        const pastelBg = computePastelBackground(threadColors);
        braid3dViewer.scene.background = new THREE.Color(pastelBg);
        snapshotBase64 = braid3dViewer.captureSnapshot(320, 200, 25, 15) || '';
        braid3dViewer.scene.background = origBg;
      }

      const docRef = await addDoc(collection(db, 'patterns'), {
        templateId: activeTemplate.id,
        patternKey: computePatternKey(activeTemplate.id, threadColors),
        templateName: activeTemplate.name_en,
        nameKo: patternName,
        nameEn: patternName,
        nThreads: disk.nThreads,
        maxSteps: MAX_STEPS,
        colors: [...threadColors],
        snapshotBase64,
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email || 'Anonymous',
        ownerPhoto: currentUser.photoURL || '',
        likes: 0,
        createdAt: serverTimestamp()
      });

      sidebarActivePatternId = docRef.id;
      currentGalleryDocId = docRef.id;
      setViewedPattern(docRef.id, 0);
      showToast(t.toastSaveGallery);
    } catch (err) {
      console.error('Error saving to gallery:', err);
      showToast(t.toastSaveGalleryError);
    } finally {
      btnSaveGallery.disabled = false;
    }
  });

  btnShareUrl.addEventListener('click', () => {
    let shareUrl;
    if (currentGalleryDocId) {
      // Use Pages Function for dynamic OG page (correct snapshot per pattern)
      shareUrl = `${window.location.origin}/og/${currentGalleryDocId}`;
    } else {
      // Fallback: short URL with encoded params (no OG snapshot)
      const patternKey = computePatternKey(activeTemplate.id, threadColors);
      const encodedColors = encodeColorsCompact(threadColors);
      shareUrl = `${window.location.origin}/s?t=${activeTemplate.id}&c=${encodedColors}&s=${currentStep}&k=${patternKey}`;
    }
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast(TRANSLATIONS[currentLang].toastShareUrl);
    }).catch(() => {
      showToast(currentLang === 'ko' ? "링크 복사 실패. 브라우저 보안 설정을 확인해 주세요." : "Clipboard copy failed. Please verify browser security permissions.");
    });
  });

  btnExportJson.addEventListener('click', () => {
    const data = getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palzzi-kumihimo-${activeTemplate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(TRANSLATIONS[currentLang].toastExportJson);
  });

  btnImportJsonTrigger.addEventListener('click', () => {
    inputImportJson.click();
  });

  inputImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        loadExportData(data);
        showToast(TRANSLATIONS[currentLang].toastImportJson);
      } catch (err) {
        showToast(TRANSLATIONS[currentLang].toastImportError);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  });

  // Export Images
  btnExportPngChart.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = chartCanvas.toDataURL('image/png');
    a.download = `palzzi-chart-${activeTemplate.id}-step${currentStep}.png`;
    a.click();
    showToast(currentLang === 'ko' ? "도안 차트 고해상도 PNG 다운로드 완료!" : "High-resolution chart PNG downloaded!");
  });

  btnExportPngBraid.addEventListener('click', () => {
    if (!braid3dViewer) return;
    // Force a render frame so the drawing buffer is fresh
    braid3dViewer.renderer.render(braid3dViewer.scene, braid3dViewer.camera);
    const a = document.createElement('a');
    a.href = braid3dViewer.renderer.domElement.toDataURL('image/png');
    a.download = `palzzi-finished-${activeTemplate.id}-step${currentStep}.png`;
    a.click();
    showToast(currentLang === 'ko' ? "완성 이미지 PNG 다운로드 완료!" : "Finished braid PNG downloaded!");
  });

  // 5. Canvas click event for thread selection
  diskCanvas.addEventListener('mousedown', onDiskClick);

  // Touch support for mobile devices
  diskCanvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    onDiskClick({
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    });
  }, { passive: false });

  // 6. View Switching (3D ↔ 2D)
  const btnShowChart = document.getElementById('btn-show-chart');
  const btnBackTo3d = document.getElementById('btn-back-to-3d');

  function switchView(targetTab) {
    tabContents.forEach(c => c.classList.remove('active'));
    document.getElementById(targetTab).classList.add('active');
    renderAll();
  }

  if (btnShowChart) btnShowChart.addEventListener('click', () => switchView('tab-chart'));
  if (btnBackTo3d) btnBackTo3d.addEventListener('click', () => switchView('tab-finished'));

  // 7. Zoom In/Out for 3D viewer
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => { braid3dViewer?.zoom(0.8); });
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => { braid3dViewer?.zoom(1.25); });

  // 8. Like button
  if (btnLike) btnLike.addEventListener('click', toggleLike);

  // 9. Sidebar sort dropdown
  if (sidebarSortSelect) {
    sidebarSortSelect.addEventListener('change', () => {
      gallerySortMode = sidebarSortSelect.value;
      resetGalleryAndReload();
    });
  }
}

function onDiskClick(e) {
  const rect = diskCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (diskCanvas.width / rect.width);
  const my = (e.clientY - rect.top) * (diskCanvas.height / rect.height);

  const slotIdx = getThreadIndexFromCoords(mx, my);
  if (slotIdx !== -1) {
    if (e.preventDefault) e.preventDefault();

    // Select this thread and show color popup
    const mappedColorIdx = mapDiskSlotToThreadColorIdx(slotIdx);
    if (mappedColorIdx !== -1) {
      selectedThreadIndex = mappedColorIdx;
      populateThreadList();
      updateColorPickerUI();
      showColorPopup(e.clientX, e.clientY);
      renderAll();
    }
  }
}

// --- Color Presets i18n Helpers (doc/7_UI) ---

// Get localized preset name based on current language
function getPresetName(preset) {
  return currentLang === 'ko' ? (preset.name_ko || preset.name) : (preset.name_en || preset.name);
}

// Render color presets circle buttons on the left panel
function renderPresetColors() {
  if (!presetColorsContainer) return;
  presetColorsContainer.innerHTML = '';
  presetColors.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.style.backgroundColor = preset.hex;
    btn.title = `${getPresetName(preset)} (${preset.hex})`;
    btn.dataset.color = preset.hex;

    btn.addEventListener('click', () => {
      if (colorPicker) colorPicker.value = preset.hex;
      if (colorHex) colorHex.value = preset.hex;
      updateSelectedThreadColor(preset.hex);
    });

    presetColorsContainer.appendChild(btn);
  });
}

// Convert HEX color string to RGB object
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Convert RGB integers to HEX color string
function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const h = Math.max(0, Math.min(255, c)).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Render dynamic preset list inside the modal with edit/delete actions
function renderModalPresetList() {
  modalPresetListContainer.innerHTML = '';
  
  presetColors.forEach((preset, idx) => {
    const item = document.createElement('div');
    item.className = 'modal-preset-item';
    
    const infoGroup = document.createElement('div');
    infoGroup.className = 'preset-info-group';
    
    const dot = document.createElement('div');
    dot.className = 'thread-dot';
    dot.style.backgroundColor = preset.hex;
    dot.style.marginBottom = '0'; // align reset
    
    const textGroup = document.createElement('div');
    textGroup.className = 'preset-info-text';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'preset-info-name';
    nameSpan.textContent = getPresetName(preset);
    
    const hexSpan = document.createElement('span');
    hexSpan.className = 'preset-info-hex';
    hexSpan.textContent = preset.hex;
    
    textGroup.appendChild(nameSpan);
    textGroup.appendChild(hexSpan);
    
    infoGroup.appendChild(dot);
    infoGroup.appendChild(textGroup);
    
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'preset-item-actions';
    
    // Edit Action Button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-action-edit';
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editBtn.title = currentLang === 'ko' ? '수정' : 'Edit';
    editBtn.addEventListener('click', () => startEditPreset(idx));
    
    // Delete Action Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-action btn-action-delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.title = currentLang === 'ko' ? '삭제' : 'Delete';
    deleteBtn.addEventListener('click', () => deletePreset(idx));
    
    actionsGroup.appendChild(editBtn);
    actionsGroup.appendChild(deleteBtn);
    
    item.appendChild(infoGroup);
    item.appendChild(actionsGroup);
    
    modalPresetListContainer.appendChild(item);
  });
}

// Open Form in Edit Mode for existing preset
function startEditPreset(idx) {
  editingPresetIndex = idx;
  const preset = presetColors[idx];
  
  modalPresetColor.value = preset.hex;
  modalPresetHex.value = preset.hex;
  modalPresetName.value = getPresetName(preset);

  formTitle.textContent = `${TRANSLATIONS[currentLang].presetFormTitleEdit}${idx + 1})`;
  btnModalCancelEdit.classList.remove('hidden');
  btnModalSave.textContent = currentLang === 'ko' ? '수정 완료' : 'Update';
}

// Reset Form to New Preset addition mode
function cancelEditPreset() {
  editingPresetIndex = -1;
  
  modalPresetColor.value = '#007AFF';
  modalPresetHex.value = '#007AFF';
  modalPresetName.value = currentLang === 'ko' ? '애플 블루' : 'Apple Blue';

  formTitle.textContent = TRANSLATIONS[currentLang].presetFormTitleAdd;
  btnModalCancelEdit.classList.add('hidden');
  btnModalSave.textContent = TRANSLATIONS[currentLang].presetSaveBtn;
}

// Delete existing preset
function deletePreset(idx) {
  const deletedName = getPresetName(presetColors[idx]);
  presetColors.splice(idx, 1);
  
  // If we deleted the preset currently in editing mode, reset form
  if (editingPresetIndex === idx) {
    cancelEditPreset();
  } else if (editingPresetIndex > idx) {
    editingPresetIndex--; // Adjust index down
  }
  
  savePresetsToStorage();
  renderModalPresetList();
  renderPresetColors();
  showToast(`${TRANSLATIONS[currentLang].presetDeletedMsg}: "${deletedName}"`);
}

// Save presets to localStorage
function savePresetsToStorage() {
  localStorage.setItem('palzzi-custom-presets', JSON.stringify(presetColors));
}

// --- Firestore User Colors Persistence ---
async function saveUserColorsToFirestore() {
  if (!currentUser) return;
  try {
    const userDocRef = doc(db, 'userColors', currentUser.uid);
    await setDoc(userDocRef, {
      templateId: activeTemplate.id,
      patternKey: computePatternKey(activeTemplate.id, threadColors),
      colors: [...threadColors],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user colors to Firestore:', err);
  }
}

async function loadUserColorsFromFirestore() {
  if (!currentUser || urlPatternLoaded) return;
  try {
    const userDocRef = doc(db, 'userColors', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      const currentKey = computePatternKey(activeTemplate.id, threadColors);
      if (data.patternKey && data.patternKey !== currentKey) return;
      if (data.templateId === activeTemplate.id && data.colors) {
        threadColors = [...data.colors];
        if (threadListContainer) populateThreadList();
        if (colorPicker || colorHex) updateColorPickerUI();
        resetSimulationToStep(currentStep);
        renderAll();
      }
    }
  } catch (err) {
    console.error('Error loading user colors from Firestore:', err);
  }
}

// Save Form (Add or Edit)
function savePreset() {
  const name = modalPresetName.value.trim();
  if (!name) {
    showToast(currentLang === 'ko' ? "색상 이름을 입력해주세요!" : "Please enter a color name!");
    return;
  }

  const hex = modalPresetHex.value.trim();
  if (!/^#[0-9A-F]{6}$/i.test(hex)) {
    showToast(currentLang === 'ko' ? "올바른 HEX 컬러 코드를 입력해주세요. (예: #FF5733)" : "Please enter a valid HEX code. (e.g., #FF5733)");
    return;
  }

  // Store name in both languages (same value for both when user creates/edits)
  const preset = { name_ko: name, name_en: name, hex };

  if (editingPresetIndex === -1) {
    // Add New mode
    presetColors.push(preset);
    showToast(`"${name}" ${TRANSLATIONS[currentLang].presetAddedMsg}`);
  } else {
    // Edit mode
    presetColors[editingPresetIndex] = preset;
    showToast(`"${name}" ${TRANSLATIONS[currentLang].presetEditedMsg}`);
  }
  
  cancelEditPreset();
  savePresetsToStorage();
  renderModalPresetList();
  renderPresetColors();
}

// --- Data Import/Export Schemas ---

function getExportData() {
  return {
    projectId: `palzzi-${activeTemplate.id}-${Date.now()}`,
    projectName: activeTemplate.name_en,
    craftType: "KUMIHIMO_ROUND",
    templateId: activeTemplate.id,
    patternKey: computePatternKey(activeTemplate.id, threadColors),
    meta: {
      totalThreads: disk.nThreads,
      diskSlots: disk.slotsCount,
      activeStep: currentStep,
    },
    colors: [...threadColors]
  };
}

function loadExportData(data) {
  if (data.colors && data.colors.length > 0) {
    const threadsCount = data.meta ? data.meta.totalThreads : data.colors.length;
    let foundTmpl = data.templateId ? KUMIHIMO_TEMPLATES.find(t => t.id === data.templateId) : null;
    if (!foundTmpl) {
      foundTmpl = KUMIHIMO_TEMPLATES.find(t => t.threads === threadsCount);
    }
    if (!foundTmpl) {
      // Fallback
      foundTmpl = {
        id: `custom-tmpl-${threadsCount}`,
        name_ko: `${threadsCount}줄 커스텀 패턴`,
        name_en: `${threadsCount}-Strand Custom Pattern`,
        threads: threadsCount,
        desc_ko: `사용자 지정 ${threadsCount}줄 쿠미히모 패턴입니다.`,
        desc_en: `User customized ${threadsCount}-strand Kumihimo pattern preset.`,
        defaultColors: [...data.colors]
      };
    }
    
    // Register custom option to dropdown if it's missing
    if (!KUMIHIMO_TEMPLATES.some(t => t.id === foundTmpl.id)) {
      KUMIHIMO_TEMPLATES.push(foundTmpl);
      setupTemplateDropdown();
    }
    
    templateSelect.value = foundTmpl.id;
    loadTemplate(foundTmpl, data.colors);
    
    if (data.meta && typeof data.meta.activeStep === 'number') {
      currentStep = data.meta.activeStep;
      resetSimulationToStep(currentStep);
    }
    renderAll();
  }
}


// Check for parameters in the URL to restore sharing state
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  // Support both short (t/c/s/k) and legacy (tmpl/colors/step/key) param names
  const tmplId = params.get('t') || params.get('tmpl');
  const colorsRaw = params.get('c');
  const colorsLegacy = params.get('colors');
  const stepParam = params.get('s') || params.get('step');
  let stepSet = false;

  if (tmplId) {
    const tmpl = KUMIHIMO_TEMPLATES.find(t => t.id === tmplId);
    if (tmpl) {
      let colors = null;
      if (colorsRaw) {
        colors = decodeColorsCompact(colorsRaw);
      } else if (colorsLegacy) {
        colors = colorsLegacy.split(',').map(c => `#${c}`);
      }
      templateSelect.value = tmpl.id;
      loadTemplate(tmpl, colors);

      if (stepParam) {
        const step = parseInt(stepParam, 10);
        if (!isNaN(step) && step >= 0 && step <= MAX_STEPS) {
          currentStep = step;
          resetSimulationToStep(currentStep);
          stepSet = true;
        }
      }
      renderAll();
      urlPatternLoaded = true;
      showToast(currentLang === 'ko' ? "공유된 상태를 불러왔습니다!" : "Successfully loaded shared pattern state!");
    }
  }
  return stepSet;
}

// Run Initial setup on page load
window.addEventListener('DOMContentLoaded', () => {
  init();
  // Fallback: if Braid3DViewer wasn't initialized (e.g. container had zero dims
  // during the synchronous init chain), retry after layout settles.
  setTimeout(() => {
    if (!braid3dViewer && braid3dContainer) {
      initBraid3DViewer();
    }
  }, 800);
});

// --- Gallery Sidebar: Cursor-based Pagination & Infinite Scroll ---\

// --- Like Feature ---

const ANON_LIKES_KEY = 'palzzi-anon-likes';
const SESSION_ID_KEY = 'palzzi-session-id';

function getSessionId() {
  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  return sid;
}

function loadAnonLikes() {
  try {
    const raw = sessionStorage.getItem(ANON_LIKES_KEY);
    anonLikes = new Set(raw ? JSON.parse(raw) : []);
  } catch { anonLikes = new Set(); }
}

function saveAnonLikes() {
  sessionStorage.setItem(ANON_LIKES_KEY, JSON.stringify([...anonLikes]));
}

function isPatternLiked(patternId) {
  return currentUserLikes.has(patternId) || anonLikes.has(patternId);
}

async function loadUserLikes() {
  if (!currentUser) { currentUserLikes = new Set(); return; }
  try {
    const snap = await getDoc(doc(db, 'userLikes', currentUser.uid));
    if (snap.exists() && snap.data().patternIds) {
      currentUserLikes = new Set(snap.data().patternIds);
    } else {
      currentUserLikes = new Set();
    }
  } catch (e) {
    console.error('Error loading user likes:', e);
    currentUserLikes = new Set();
  }
  updateLikeUI();
}

async function toggleLike() {
  if (!currentViewedPatternId) return;

  const liked = isPatternLiked(currentViewedPatternId);

  // --- Anonymous user: sessionStorage + Firestore count ---
  if (!currentUser) {
    const sessionId = getSessionId();
    const patternRef = doc(db, 'patterns', currentViewedPatternId);
    const likeRef = doc(patternRef, 'likes', sessionId);

    if (liked) {
      anonLikes.delete(currentViewedPatternId);
      currentPatternLikeCount = Math.max(0, currentPatternLikeCount - 1);
    } else {
      anonLikes.add(currentViewedPatternId);
      currentPatternLikeCount++;
    }
    saveAnonLikes();
    updateLikeUI();
    animateLikeButton();

    try {
      await runTransaction(db, async (transaction) => {
        const patternSnap = await transaction.get(patternRef);
        const currentLikes = patternSnap.exists() ? (patternSnap.data().likes || 0) : 0;
        if (liked) {
          transaction.delete(likeRef);
          transaction.update(patternRef, { likes: Math.max(0, currentLikes - 1) });
        } else {
          transaction.set(likeRef, { sessionId, createdAt: serverTimestamp() });
          transaction.update(patternRef, { likes: currentLikes + 1 });
        }
      });
    } catch (e) {
      console.error('Anon like toggle error:', e);
      if (liked) { anonLikes.add(currentViewedPatternId); }
      else { anonLikes.delete(currentViewedPatternId); }
      currentPatternLikeCount = liked ? currentPatternLikeCount + 1 : Math.max(0, currentPatternLikeCount - 1);
      saveAnonLikes();
      updateLikeUI();
    }
    return;
  }

  // --- Authenticated user: Firestore transaction ---
  const patternRef = doc(db, 'patterns', currentViewedPatternId);
  const likeRef = doc(patternRef, 'likes', currentUser.uid);
  const userLikesRef = doc(db, 'userLikes', currentUser.uid);
  const isLiked = currentUserLikes.has(currentViewedPatternId);

  // Optimistic UI update
  if (isLiked) {
    currentUserLikes.delete(currentViewedPatternId);
    currentPatternLikeCount = Math.max(0, currentPatternLikeCount - 1);
  } else {
    currentUserLikes.add(currentViewedPatternId);
    currentPatternLikeCount++;
  }
  updateLikeUI();
  animateLikeButton();

  try {
    await runTransaction(db, async (transaction) => {
      // All reads first
      const patternSnap = await transaction.get(patternRef);
      const userLikesSnap = await transaction.get(userLikesRef);
      const currentLikes = patternSnap.exists() ? (patternSnap.data().likes || 0) : 0;

      // Then all writes
      if (isLiked) {
        transaction.delete(likeRef);
        transaction.update(patternRef, { likes: Math.max(0, currentLikes - 1) });
      } else {
        transaction.set(likeRef, { createdAt: serverTimestamp() });
        transaction.update(patternRef, { likes: currentLikes + 1 });
      }

      if (isLiked) {
        if (userLikesSnap.exists()) {
          transaction.update(userLikesRef, { patternIds: arrayRemove(currentViewedPatternId) });
        }
      } else {
        if (userLikesSnap.exists()) {
          transaction.update(userLikesRef, { patternIds: arrayUnion(currentViewedPatternId) });
        } else {
          transaction.set(userLikesRef, { patternIds: [currentViewedPatternId] });
        }
      }
    });
  } catch (e) {
    console.error('Like toggle error:', e);
    // Revert optimistic update
    if (isLiked) {
      currentUserLikes.add(currentViewedPatternId);
      currentPatternLikeCount++;
    } else {
      currentUserLikes.delete(currentViewedPatternId);
      currentPatternLikeCount = Math.max(0, currentPatternLikeCount - 1);
    }
    updateLikeUI();
    showToast(TRANSLATIONS[currentLang].toastLikeError);
  }
}

function updateLikeUI() {
  if (!btnLike || !previewLikeCount) return;
  const isLiked = currentViewedPatternId && isPatternLiked(currentViewedPatternId);

  // Heart button icon
  const heartIcon = btnLike.querySelector('i');
  if (isLiked) {
    btnLike.classList.add('liked');
    heartIcon.className = 'fa-solid fa-heart';
  } else {
    btnLike.classList.remove('liked');
    heartIcon.className = 'fa-regular fa-heart';
  }

  // Info bar count
  const countSpan = previewLikeCount.querySelector('span');
  const countIcon = previewLikeCount.querySelector('i');
  if (countSpan) {
    const t = TRANSLATIONS[currentLang];
    countSpan.textContent = t.likesCount.replace('{count}', currentPatternLikeCount);
  }
  if (countIcon) {
    countIcon.className = 'fa-solid fa-heart';
  }
  applyLikePulse(previewLikeCount, currentPatternLikeCount);
}

function animateLikeButton() {
  if (!btnLike) return;
  btnLike.classList.remove('animate');
  void btnLike.offsetWidth; // force reflow to restart animation
  btnLike.classList.add('animate');
}

function getPulseDuration(likes) {
  if (likes < 2) return null;
  const duration = Math.max(0.8, 3.0 - Math.log2(likes + 1) * 0.5);
  return duration.toFixed(2) + 's';
}

function applyLikePulse(el, likes) {
  if (!el) return;
  const dur = getPulseDuration(likes);
  if (dur) {
    el.classList.add('like-pulse');
    el.style.setProperty('--pulse-duration', dur);
  } else {
    el.classList.remove('like-pulse');
    el.style.removeProperty('--pulse-duration');
  }
}

function setViewedPattern(patternId, likes) {
  currentViewedPatternId = patternId;
  currentPatternLikeCount = likes || 0;
  updateLikeUI();
}

const SIDEBAR_PAGE_SIZE = 5;

async function loadGalleryPage() {
  if (sidebarLoadingMore || !sidebarHasMore) return;
  sidebarLoadingMore = true;

  if (sidebarLoadingEl) sidebarLoadingEl.classList.remove('hidden');

  try {
    if (gallerySortMode === 'myLikes' && currentUser) {
      // Load user's liked patterns in batches
      if (myLikedPatternIds.length === 0 && myLikesOffset === 0) {
        const snap = await getDoc(doc(db, 'userLikes', currentUser.uid));
        if (snap.exists() && snap.data().patternIds) {
          myLikedPatternIds = snap.data().patternIds;
        }
      }
      const batch = myLikedPatternIds.slice(myLikesOffset, myLikesOffset + SIDEBAR_PAGE_SIZE);
      if (batch.length === 0) {
        sidebarHasMore = false;
      } else {
        for (const pid of batch) {
          const pSnap = await getDoc(doc(db, 'patterns', pid));
          if (pSnap.exists()) {
            const pattern = { id: pSnap.id, ...pSnap.data() };
            sidebarPatterns.push(pattern);
            const card = renderSidebarCard(pattern);
            sidebarPatternList.insertBefore(card, sidebarSentinel);
          }
        }
        myLikesOffset += batch.length;
        if (myLikesOffset >= myLikedPatternIds.length) {
          sidebarHasMore = false;
        }
      }
    } else {
      let q;
      const orderField = gallerySortMode === 'mostLiked' ? 'likes' : 'createdAt';
      const orderDir = 'desc';

      if (sidebarLastDoc) {
        q = query(collection(db, 'patterns'), orderBy(orderField, orderDir), limit(SIDEBAR_PAGE_SIZE), startAfter(sidebarLastDoc));
      } else {
        q = query(collection(db, 'patterns'), orderBy(orderField, orderDir), limit(SIDEBAR_PAGE_SIZE));
      }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      sidebarHasMore = false;
    } else {
      sidebarLastDoc = snapshot.docs[snapshot.docs.length - 1];

      snapshot.forEach(docSnap => {
        const pattern = { id: docSnap.id, ...docSnap.data() };
        sidebarPatterns.push(pattern);
        const card = renderSidebarCard(pattern);
        sidebarPatternList.insertBefore(card, sidebarSentinel);
      });

      // If fewer results than page size, no more pages
      if (snapshot.docs.length < SIDEBAR_PAGE_SIZE) {
        sidebarHasMore = false;
      }
    }
    } // end else (non-myLikes mode)
  } catch (err) {
    console.error('Error loading gallery sidebar:', err);
    sidebarHasMore = false;
  }

  sidebarLoadingMore = false;
  if (sidebarLoadingEl) sidebarLoadingEl.classList.add('hidden');

  // If content doesn't overflow yet, load more to fill the viewport
  if (gallerySidebar && gallerySidebar._checkOverflow) {
    requestAnimationFrame(() => gallerySidebar._checkOverflow());
  }
}

function resetGalleryAndReload() {
  sidebarPatterns = [];
  sidebarLastDoc = null;
  sidebarHasMore = true;
  myLikesOffset = 0;
  myLikedPatternIds = [];
  sidebarPatternList.querySelectorAll('.sidebar-pattern-card').forEach(c => c.remove());
  loadGalleryPage();
}

function renderSidebarCard(pattern) {
  const t = TRANSLATIONS[currentLang];
  const card = document.createElement('div');
  card.className = 'sidebar-pattern-card';
  card.dataset.id = pattern.id;

  const patternName = currentLang === 'ko'
    ? (pattern.nameKo || pattern.templateName || t.sidebarUnknown)
    : (pattern.nameEn || pattern.templateName || t.sidebarUnknown);

  const threadsLabel = pattern.nThreads ? `${pattern.nThreads}${t.sidebarThreadsUnit}` : '-';
  const likeCount = pattern.likes || 0;
  const isLiked = isPatternLiked(pattern.id);
  const likeClass = isLiked ? ' liked' : '';
  const likeIcon = 'fa-solid fa-heart';

  card.innerHTML = `
    <div class="sidebar-card-preview">${pattern.snapshotBase64
      ? `<img src="${pattern.snapshotBase64}" alt="${patternName}" class="sidebar-card-snapshot" width="56" height="56">`
      : `<canvas width="56" height="56"></canvas>`}</div>
    <div class="sidebar-card-info">
      <div class="sidebar-card-name">${patternName}</div>
      <div class="sidebar-card-meta">
        <span>${threadsLabel}</span>
        <span class="sidebar-card-likes${likeClass}"><i class="${likeIcon}"></i> ${likeCount}</span>
      </div>
      <div class="sidebar-card-colors">${(pattern.colors || []).slice(0, 6).map(c => `<div class="sidebar-card-dot" style="background-color:${c}"></div>`).join('')}</div>
    </div>
  `;

  // Render braid preview on canvas only if no snapshot available
  if (!pattern.snapshotBase64) {
    const canvas = card.querySelector('canvas');
    drawSidebarBraidPreview(canvas, pattern.colors || [], pattern.nThreads || 8, pattern.maxSteps || 120);
  }

  applyLikePulse(card.querySelector('.sidebar-card-likes'), likeCount);

  card.addEventListener('click', () => {
    sidebarActivePatternId = pattern.id;
    document.querySelectorAll('.sidebar-pattern-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    loadPatternToSimulator(pattern);
  });

  return card;
}

function drawSidebarBraidPreview(canvas, colors, nThreads, maxSteps) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, w, h);

  if (colors.length === 0 || nThreads === 0) return;

  const threadColors = [...colors];
  while (threadColors.length < nThreads) threadColors.push('#ccc');

  const previewDisk = new KumihimoDisk(nThreads);
  previewDisk.init(threadColors);

  const sRadius = calcBraidRadius(nThreads);
  const sPitch = calcBraidPitch(nThreads, sRadius);
  const sVStretch = calcBraidVStretch(nThreads);
  const effectivePitch = sPitch * sVStretch;
  const maxVisibleRows = Math.floor((h - 4) / effectivePitch);

  // Simulate extra rows beyond the canvas so the braid overflows naturally (canvas clips the rest)
  const simSteps = Math.min(maxSteps, Math.floor(maxVisibleRows * 2));
  for (let s = 0; s < simSteps; s++) previewDisk.weaveRowFast();

  if (previewDisk.productColors.length <= 1) return;

  const sStartY = 8;
  const SIDEBAR_STRAND_WIDTH = 3;

  ctx.save();
  ctx.translate(w / 2, 0);

  const endRowIdx = previewDisk.productColors.length;

  const segments = [];
  for (let r = 1; r < endRowIdx; r++) {
    const prevRow = previewDisk.productColors[r - 1];
    const currRow = previewDisk.productColors[r];
    const prevY = sStartY + (r - 1) * effectivePitch;
    const currY = sStartY + r * effectivePitch;

    for (let i = 0; i < previewDisk.nThreads; i++) {
      const prevThread = prevRow[i];
      const currThread = currRow[i];
      if (!prevThread || !currThread) continue;

      const prevTheta = (prevThread.slot * 2 * Math.PI) / previewDisk.slotsCount - Math.PI / 2;
      const currTheta = (currThread.slot * 2 * Math.PI) / previewDisk.slotsCount - Math.PI / 2;

      let diff = currTheta - prevTheta;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      const adjustedCurrTheta = prevTheta + diff;

      const prevX = sRadius * Math.sin(prevTheta);
      const prevZ = sRadius * Math.cos(prevTheta);
      const currX = sRadius * Math.sin(adjustedCurrTheta);
      const currZ = sRadius * Math.cos(adjustedCurrTheta);

      if (prevZ > -sRadius * CULLING_RATIO || currZ > -sRadius * CULLING_RATIO) {
        const avgZ = (prevZ + currZ) / 2;
        segments.push({ color: currThread.color, fx: prevX, fy: prevY, tx: currX, ty: currY, avgZ });
      }
    }
  }

  segments.sort((a, b) => a.avgZ - b.avgZ);

  segments.forEach(seg => {
    const zNorm = (seg.avgZ + sRadius) / (2 * sRadius);
    const lightingFactor = LIGHTING_MIN + LIGHTING_RANGE * zNorm;
    const shadedColor = adjustColorBrightness(seg.color, lightingFactor);
    const lw = SIDEBAR_STRAND_WIDTH * (0.5 + 0.8 * zNorm);

    ctx.beginPath();
    ctx.moveTo(seg.fx, seg.fy);
    ctx.lineTo(seg.tx, seg.ty);
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.strokeStyle = shadedColor;
    ctx.shadowColor = `rgba(0,0,0,${0.1 + 0.35 * zNorm})`;
    ctx.shadowBlur = 2 + 5 * zNorm;
    ctx.shadowOffsetY = 1 + 3 * zNorm;
    ctx.stroke();
  });

  ctx.restore();
}

function loadPatternToSimulator(pattern) {
  let tmpl = KUMIHIMO_TEMPLATES.find(t => t.id === pattern.templateId);
  if (!tmpl) {
    tmpl = {
      id: `custom-${pattern.nThreads}`,
      name_ko: `${pattern.nThreads}가닥 커스텀`,
      name_en: `${pattern.nThreads}-Strand Custom`,
      threads: pattern.nThreads,
      desc_ko: '사용자 지정 패턴',
      desc_en: 'User custom pattern',
      defaultColors: [...(pattern.colors || [])]
    };
    if (!KUMIHIMO_TEMPLATES.some(t => t.id === tmpl.id)) {
      KUMIHIMO_TEMPLATES.push(tmpl);
      setupTemplateDropdown();
    }
  }

  templateSelect.value = tmpl.id;
  loadTemplate(tmpl, pattern.colors);

  const targetStep = Math.min(pattern.maxSteps || MAX_STEPS, MAX_STEPS);
  while (currentStep < targetStep) {
    disk.weaveRowFast();
    currentStep = disk.rowIndex;
  }
  updatePlaybackUI();

  renderAll();
  currentGalleryDocId = pattern.id;
  setViewedPattern(pattern.id, pattern.likes);
  showToast(currentLang === 'ko' ? '패턴을 불러왔습니다!' : 'Pattern loaded!');
}

function setupSidebarInfiniteScroll() {
  if (!gallerySidebar) return;

  // Explicitly set sidebar height so overflow-y: auto works
  function updateSidebarHeight() {
    const topBar = document.querySelector('.top-bar');
    const topBarH = topBar ? topBar.offsetHeight : 0;
    gallerySidebar.style.height = (window.innerHeight - topBarH) + 'px';
  }
  updateSidebarHeight();
  window.addEventListener('resize', updateSidebarHeight);

  // After each load, check if we need more items to fill the viewport
  gallerySidebar._checkOverflow = () => {
    if (sidebarLoadingMore || !sidebarHasMore) return;
    const { scrollHeight, clientHeight } = gallerySidebar;
    if (scrollHeight <= clientHeight) {
      // Content doesn't overflow yet — load more
      loadGalleryPage();
    }
  };

  // Scroll-based infinite scroll
  let scrollTicking = false;
  gallerySidebar.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTicking = false;
      if (sidebarLoadingMore || !sidebarHasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = gallerySidebar;
      if (scrollHeight > clientHeight && scrollTop + clientHeight >= scrollHeight - 100) {
        loadGalleryPage();
      }
    });
  });
}

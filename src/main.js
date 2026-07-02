import { KumihimoDisk } from './engine/kumihimo.js';
import { KUMIHIMO_TEMPLATES } from './templates/templates.js';
import { db } from './firebase/config.js';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { signInWithGoogle, signOutUser, onAuthChange } from './firebase/auth.js';

// --- Multilingual i18n Translations Dictionary (doc/2_PRD) ---
const TRANSLATIONS = {
  ko: {
    title: "Palzzi - 쿠미히모 2D 시뮬레이터",
    logoTitle: "Palzzi",
    jsonSave: "JSON 저장",
    jsonLoad: "JSON 불러오기",
    pngChart: "도안 (PNG)",
    pngBraid: "완성본 (PNG)",
    templateSelect: "템플릿 선택",
    patternTemplate: "패턴 템플릿",
    metaThreads: " 가닥",
    metaDifficulty: "난이도: ",
    diffEasy: "쉬움",
    diffMedium: "보통",
    diffHard: "어려움",
    colorCustomizer: "실 색상 커스텀",
    colorPickerLabel: "선택된 실 색상:",
    colorPresetsLabel: "프리셋 컬러:",
    managePresetsBtn: "관리",
    sectionHint: "디스크 위의 실이나 아래 리스트를 누른 뒤 색상을 변경하세요.",
    storageShare: "저장 및 공유",
    saveLocalBtn: "내 보관함에 저장 (Browser)",
    loadLocalBtn: "보관함 불러오기",
    shareUrlBtn: "공유 링크 복사 (URL)",
    copyUrlBtn: "URL 복사",
    stepLabel: "PROGRESS:",
    stepCounterPrefix: "스텝",
    autoplaySpeed: "배속:",
    maxLenLabel: "최대 길이 (Rows):",
    tabVirtualBraid: "3D 가상 완성본 2D 뷰",
    tabPatternChart: "기호 도안 차트 (Pattern Chart)",
    tabVirtualDesc: "현재 단계까지 짜인 매듭의 회전 꼬임을 2D 원통 구조로 펼쳐서 보여줍니다.",
    tabChartDesc: "실의 상호 치환 이동 내역을 도안 차트로 시각화합니다. (가로축: 실, 세로축: 스텝 진행)",
    zoomLabel: "화면 배율:",
    pitchLabel: "땋임 촘촘함:",
    dragHint: "아래 컨트롤러를 이용해 직조하세요.",
    popupTitle: "실 색상 선택",
    popupNamePlaceholder: "새 색상 이름",
    popupSaveBtn: "저장",
    toastPresetSaved: "새 색상이 프리셋에 저장되었습니다!",
    toastColorApplied: "실 색상이 변경되었습니다!",
    toastSaveLocal: "브라우저 내 보관함에 저장되었습니다!",
    toastLoadLocal: "보관함 데이터를 성공적으로 복구했습니다!",
    toastNoLocal: "저장된 보관함 데이터가 없습니다.",
    toastShareUrl: "공유 링크가 클립보드에 복사되었습니다!",
    toastExportJson: "JSON 파일 저장 완료!",
    toastImportJson: "JSON 설정 불러오기 완료!",
    toastImportError: "오류: 올바르지 않은 JSON 파일입니다.",
    toastStepSuccess: "직조 한 단계 성공!",
    toastStepComplete: "직조 완료!",
    toastStopError: "오류로 정지: ",
    toastAutoplayStart: "자동 재생 시작",
    toastAutoplayPause: "일시정지됨",
    guideComplete: "직조 완료! 수고하셨습니다. 도안을 저장하세요!",
    guidePrefix: "[우측 상단] ",
    guideSuffix: "번 슬롯 실을 아래 ",
    guideSuffix2: "번으로 이동시켜 시작하세요.",
    presetModalTitle: "컬러 프리셋 관리",
    presetFormTitleAdd: "새 프리셋 추가",
    presetFormTitleEdit: "프리셋 수정 (#",
    presetColorLabel: "색상 선택 (Color Picker)",
    presetNameLabel: "색상 이름",
    presetNamePlaceholder: "예: 아쿠아 블루",
    presetSaveBtn: "저장",
    presetCancelEditBtn: "수정 취소",
    presetListTitle: "프리셋 목록",
    presetModalCloseDone: "완료 및 닫기",
    presetDeletedMsg: "프리셋 삭제됨",
    presetAddedMsg: "등록 완료!",
    presetEditedMsg: "수정 완료!",
    galleryLink: "갤러리",
    saveGalleryBtn: "저장",
    toastSaveGallery: "갤러리에 저장되었습니다!",
    toastSaveGalleryError: "갤러리 저장에 실패했습니다.",
    galleryPatternName: "내 쿠미히모 패턴",
    strandWidthLabel: "실 굵기:",
    settingsTitle: "설정",
    settingsDisplay: "브레이드 표시 설정",
    settingsPlayback: "재생 설정",
    settingsStorage: "저장 및 공유",
    exportLabel: "내보내기",
    signInWithGoogle: "Google 로그인",
    signOut: "로그아웃",
    signInRequired: "갤러리에 저장하려면 먼저 로그인하세요.",
  },
  en: {
    title: "Palzzi - Kumihimo 2D Simulator",
    logoTitle: "Palzzi",
    jsonSave: "Save JSON",
    jsonLoad: "Load JSON",
    pngChart: "Chart (PNG)",
    pngBraid: "Finished (PNG)",
    templateSelect: "Select Template",
    patternTemplate: "Pattern Template",
    metaThreads: " Strands",
    metaDifficulty: "Difficulty: ",
    diffEasy: "Easy",
    diffMedium: "Medium",
    diffHard: "Hard",
    colorCustomizer: "Thread Colors",
    colorPickerLabel: "Selected Color:",
    colorPresetsLabel: "Presets:",
    managePresetsBtn: "Manage",
    sectionHint: "Click threads on the disk or list below, then choose a color.",
    storageShare: "Save & Share",
    saveLocalBtn: "Save to Browser Pocket",
    loadLocalBtn: "Load from Pocket",
    shareUrlBtn: "Copy Share Link (URL)",
    copyUrlBtn: "Copy URL",
    stepLabel: "PROGRESS:",
    stepCounterPrefix: "Step",
    autoplaySpeed: "Speed:",
    maxLenLabel: "Max Length (Rows):",
    tabVirtualBraid: "3D Virtual Braid View",
    tabPatternChart: "Pattern Chart View",
    tabVirtualDesc: "Displays the spiral twists of the braid up to the current step in a 2D cylindrical projection.",
    tabChartDesc: "Visualizes thread transposition history in a pattern grid. (X-axis: thread, Y-axis: step)",
    zoomLabel: "View Zoom:",
    pitchLabel: "Braid Tension:",
    dragHint: "Use the playback controls below to braid.",
    popupTitle: "Thread Color",
    popupNamePlaceholder: "New color name",
    popupSaveBtn: "Save",
    toastPresetSaved: "New color saved to presets!",
    toastColorApplied: "Thread color changed!",
    toastSaveLocal: "Successfully saved to browser pocket!",
    toastLoadLocal: "Pocket data successfully recovered!",
    toastNoLocal: "No pocket data found.",
    toastShareUrl: "Share link copied to clipboard!",
    toastExportJson: "JSON config exported successfully!",
    toastImportJson: "JSON config imported successfully!",
    toastImportError: "Error: Invalid JSON file format.",
    toastStepSuccess: "Braid step complete!",
    toastStepComplete: "Braiding finished!",
    toastStopError: "Stopped due to error: ",
    toastAutoplayStart: "Autoplay started",
    toastAutoplayPause: "Autoplay paused",
    guideComplete: "Braiding complete! Great job, save your pattern!",
    guidePrefix: "[Top Right] Move ",
    guideSuffix: " thread to bottom ",
    guideSuffix2: " to start.",
    presetModalTitle: "Manage Color Presets",
    presetFormTitleAdd: "Add New Preset",
    presetFormTitleEdit: "Edit Preset (#",
    presetColorLabel: "Select Color (Color Picker)",
    presetNameLabel: "Color Name",
    presetNamePlaceholder: "e.g., Aqua Blue",
    presetSaveBtn: "Save",
    presetCancelEditBtn: "Cancel Edit",
    presetListTitle: "Preset List",
    presetModalCloseDone: "Done & Close",
    presetDeletedMsg: "Preset deleted",
    presetAddedMsg: "added successfully!",
    presetEditedMsg: "updated successfully!",
    galleryLink: "Gallery",
    saveGalleryBtn: "Save",
    toastSaveGallery: "Saved to gallery!",
    toastSaveGalleryError: "Failed to save to gallery.",
    galleryPatternName: "My Kumihimo Pattern",
    strandWidthLabel: "Strand width:",
    settingsTitle: "Settings",
    settingsDisplay: "Braid Display",
    settingsPlayback: "Playback",
    settingsStorage: "Storage & Sharing",
    exportLabel: "Export",
    signInWithGoogle: "Sign in with Google",
    signOut: "Sign out",
    signInRequired: "Please sign in first to save to gallery.",
  }
};

// Application State
let currentLang = 'en'; // Default to English as requested
let currentUser = null;
let disk = new KumihimoDisk(8);
let activeTemplate = KUMIHIMO_TEMPLATES[2]; // Default: 8-Strand Candy Cane
let threadColors = [...activeTemplate.defaultColors];
let currentStep = 0;
let MAX_STEPS = 120; // Changed to let to allow dynamic adjustments in UI (UX Upgrade)
let isPlaying = false;
let playInterval = null;
let selectedThreadIndex = -1; // Index in the active threads (0 to nThreads-1)
let braidZoom = 0.70; // Braid viewer scale level. Default is zoom out 70% (UX upgrade)
let braidPitch = 3.5; // Braid weaving compactness pitch spacing
let strandWidthRatio = 0.6; // Strand width as ratio of radius (controls thickness)

// Auto-adjust pitch and strand width based on thread count for optimal preview
function autoAdjustBraidParams() {
  const n = disk.nThreads;
  if (n <= 8) {
    braidPitch = 3.5;
    strandWidthRatio = 0.60;
  } else if (n <= 16) {
    braidPitch = 3.0;
    strandWidthRatio = 0.45;
  } else if (n <= 28) {
    braidPitch = 2.5;
    strandWidthRatio = 0.35;
  } else {
    braidPitch = 2.0;
    strandWidthRatio = 0.25;
  }
  // Sync settings sliders to reflect the new values
  const settingsPitch = document.getElementById('settings-pitch');
  const settingsPitchVal = document.getElementById('settings-pitch-val');
  const settingsStrandWidth = document.getElementById('settings-strand-width');
  const settingsStrandWidthVal = document.getElementById('settings-strand-width-val');
  if (settingsPitch) settingsPitch.value = braidPitch;
  if (settingsPitchVal) settingsPitchVal.textContent = braidPitch.toFixed(1);
  if (settingsStrandWidth) settingsStrandWidth.value = strandWidthRatio;
  if (settingsStrandWidthVal) settingsStrandWidthVal.textContent = strandWidthRatio.toFixed(2);
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


// DOM Elements
const templateSelect = document.getElementById('template-select');
const templateDesc = document.getElementById('template-desc');
const metaThreads = document.getElementById('meta-threads');
const metaDifficulty = document.getElementById('meta-difficulty');
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
const braidCanvas = document.getElementById('braid-canvas');
const chartCanvas = document.getElementById('chart-canvas');

const stepCounter = document.getElementById('step-counter');
const guideText = document.getElementById('guide-text');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');

// Playback Buttons
const btnFirst = document.getElementById('btn-first');
const btnPrev = document.getElementById('btn-prev');
const btnPlay = document.getElementById('btn-play');
const btnNext = document.getElementById('btn-next');
const btnLast = document.getElementById('btn-last');

// Storage & Export Buttons
const authArea = document.getElementById('auth-area');
const btnSaveGallery = document.getElementById('btn-save-gallery');
const btnSaveLocal = document.getElementById('btn-save-local');
const btnLoadLocal = document.getElementById('btn-load-local');
const btnShareUrl = document.getElementById('btn-share-url');
const btnExportJson = document.getElementById('btn-export-json');
const btnImportJsonTrigger = document.getElementById('btn-import-json-trigger');
const inputImportJson = document.getElementById('input-import-json');
const btnExportPngChart = document.getElementById('btn-export-png-chart');
const btnExportPngBraid = document.getElementById('btn-export-png-braid');

// Tabs
const tabButtons = document.querySelectorAll('.view-tab');
const tabContents = document.querySelectorAll('.tab-content');

// Canvas Contexts
const ctxDisk = diskCanvas.getContext('2d');
const ctxBraid = braidCanvas.getContext('2d');
const ctxChart = chartCanvas.getContext('2d');

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
  // Auth state listener
  onAuthChange((user) => {
    currentUser = user;
    updateAuthUI(user);
    if (user) {
      loadUserColorsFromFirestore();
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
  checkUrlParams();
  
  // Render initially
  renderPresetColors();
  renderAll();
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
  
  let diffText = "";
  if (activeTemplate.threads >= 12) {
    diffText = TRANSLATIONS[currentLang].diffHard;
  } else if (activeTemplate.threads >= 8) {
    diffText = TRANSLATIONS[currentLang].diffMedium;
  } else {
    diffText = TRANSLATIONS[currentLang].diffEasy;
  }
  metaDifficulty.innerHTML = `<i class="fa-solid fa-gauge-simple-high"></i> ${TRANSLATIONS[currentLang].metaDifficulty}${diffText}`;
}

// Load selected template
function loadTemplate(tmpl, customColors = null) {
  activeTemplate = tmpl;
  disk = new KumihimoDisk(tmpl.threads);
  threadColors = customColors ? [...customColors] : [...tmpl.defaultColors];
  
  // Adjust progress bar bounds
  progressBar.max = MAX_STEPS;
  currentStep = 0;
  progressBar.value = 0;
  
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
      disk.weaveRow();
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
  progressBar.value = currentStep;
  progressPercentage.textContent = `${Math.round((currentStep / MAX_STEPS) * 100)}%`;
}

// --- Renderers ---

function renderAll() {
  drawDisk();
  drawBraid();
  drawChart();
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
 * Draw Virtual Finished Braided Cord preview with 3D Helix Projection (doc/6_KumihimoVisualization)
 */
function drawBraid() {
  ctxBraid.clearRect(0, 0, braidCanvas.width, braidCanvas.height);
  
  const width = braidCanvas.width;
  const height = braidCanvas.height;
  const cx = width / 2;
  
  // Background - Clean canvas (Drawn before scaling so it fills the whole canvas)
  ctxBraid.fillStyle = '#f8f9fa';
  ctxBraid.fillRect(0, 0, width, height);

  // If there's no braided history, guide the user (rendered before scale for crisp text)
  if (disk.productColors.length <= 1) {
    ctxBraid.fillStyle = '#86868b';
    ctxBraid.font = '13px sans-serif';
    ctxBraid.textAlign = 'center';
    ctxBraid.fillText(TRANSLATIONS[currentLang].dragHint, cx, height / 2);
    return;
  }

  // --- Start 3D Scaled Vector Drawing ---
  ctxBraid.save();
  // Translate horizontal center and apply zoom scale centering (UX Upgrade)
  ctxBraid.translate(cx, 0);
  ctxBraid.scale(braidZoom, braidZoom);
  
  // Cylinder Geometric Constants
  const radius = 33; // Cylinder radius (tightly scaled)
  const pitch = braidPitch; // Compact pitch spacing for tight weaving density (UX Upgrade)
  const nThreads = disk.nThreads;
  
  // Draw top hanger loop or starting knot inside scale
  ctxBraid.beginPath();
  ctxBraid.arc(0, 30, 14, 0, 2 * Math.PI);
  ctxBraid.fillStyle = '#8a7e72'; // Knot
  ctxBraid.fill();
  
  ctxBraid.beginPath();
  ctxBraid.moveTo(-5, 0);
  ctxBraid.lineTo(-5, 30);
  ctxBraid.moveTo(5, 0);
  ctxBraid.lineTo(5, 30);
  ctxBraid.strokeStyle = '#a69c91';
  ctxBraid.lineWidth = 5;
  ctxBraid.stroke();
  
  const maxVisibleRows = Math.floor(((height / braidZoom) - 80) / pitch);
  const totalRows = disk.productColors.length;
  const endRowIdx = Math.min(totalRows, maxVisibleRows);
  
  // Collect all segments across all active rows
  const segments = [];
  
  for (let r = 1; r < endRowIdx; r++) {
    const prevRow = disk.productColors[r - 1];
    const currRow = disk.productColors[r];
    
    const prevY = 32 + (r - 1) * pitch;
    const currY = 32 + r * pitch;
    
    for (let i = 0; i < nThreads; i++) {
      const prevThread = prevRow[i];
      const currThread = currRow[i];
      
      if (!prevThread || !currThread) continue;
      
      // We map the slot index (0 to slotsCount - 1) to 3D angles
      const prevTheta = (prevThread.slot * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
      const currTheta = (currThread.slot * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
      
      // Calculate continuous angular distance to avoid backward-spin jumps
      let diff = currTheta - prevTheta;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      const adjustedCurrTheta = prevTheta + diff;
      
      // Calculate projected positions (cx is now 0 due to translate)
      const prevX = radius * Math.sin(prevTheta);
      const prevZ = radius * Math.cos(prevTheta);
      
      const currX = radius * Math.sin(adjustedCurrTheta);
      const currZ = radius * Math.cos(adjustedCurrTheta);
      
      // Only keep segments that are visible on the front of the cylinder (Z > -10 for smooth curvature)
      if (prevZ > -12 || currZ > -12) {
        const avgZ = (prevZ + currZ) / 2;
        segments.push({
          threadId: i,
          color: currThread.color,
          fx: prevX,
          fy: prevY,
          tx: currX,
          ty: currY,
          fz: prevZ,
          tz: currZ,
          avgZ: avgZ
        });
      }
    }
  }
  
  // Depth sort: back threads first (smaller avgZ), front threads last (larger avgZ)
  segments.sort((a, b) => a.avgZ - b.avgZ);
  
  // Render sorted segments to build a perfect overlapping cylinder braid with WAVY natural edges
  segments.forEach(seg => {
    ctxBraid.save();
    ctxBraid.beginPath();
    ctxBraid.moveTo(seg.fx, seg.fy);
    ctxBraid.lineTo(seg.tx, seg.ty);
    
    // Compute thread thickness — controlled by strandWidthRatio slider
    const strandWidth = Math.max(5, Math.min(18, radius * strandWidthRatio));
    
    ctxBraid.lineWidth = strandWidth;
    ctxBraid.lineCap = 'round';
    
    // Calculate realistic lighting factor based on Z-depth (center is bright, sides are dark)
    // This removes the grey overlay box entirely and makes colors extremely glowing!
    const lightingFactor = 0.52 + 0.48 * ((seg.avgZ + radius) / (2 * radius)); // range 0.52 to 1.0
    const shadedColor = adjustColorBrightness(seg.color, lightingFactor);
    
    ctxBraid.strokeStyle = shadedColor;
    
    // Draw thread segments with smooth depth overlap shadow
    ctxBraid.shadowColor = 'rgba(0,0,0,0.18)';
    ctxBraid.shadowBlur = 2.5;
    ctxBraid.shadowOffsetY = 1;
    ctxBraid.stroke();
    
    // Draw bright luster highlight inside the fiber for silk texture sheen
    ctxBraid.beginPath();
    ctxBraid.moveTo(seg.fx, seg.fy);
    ctxBraid.lineTo(seg.tx, seg.ty);
    ctxBraid.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctxBraid.lineWidth = strandWidth * 0.35;
    ctxBraid.shadowColor = 'transparent'; // No blur for highlights
    ctxBraid.stroke();
    
    ctxBraid.restore();
  });

  // Note: We completely removed the direct linear-gradient rect overlay (fillRect) that was
  // causing the edges to be hard straight lines and making the colors grey and dull.
  // Now, because lineCap='round' is used on each segment, the cylinder naturally has a beautiful,
  // wavy, bumpy outline (실의 꼬임 결에 따른 올록볼록한 입체 윤곽선) which looks like real thread!

  // 3. Draw Bottom Fringe knot and loose threads hanging down
  const bottomY = 32 + (endRowIdx - 1) * pitch;
  ctxBraid.save();
  ctxBraid.beginPath();
  ctxBraid.arc(0, bottomY, 11, 0, 2 * Math.PI);
  ctxBraid.fillStyle = '#8a7e72'; // Fringe lock
  ctxBraid.fill();
  
  // Hanging threads
  const lastRow = disk.productColors[endRowIdx - 1] || [];
  const nHanging = lastRow.length;
  
  for (let i = 0; i < nHanging; i++) {
    const thread = lastRow[i];
    if (!thread) continue;
    const color = thread.color;
    const tx = -radius + (i / (nHanging - 1)) * (radius * 2);
    
    ctxBraid.beginPath();
    ctxBraid.moveTo(0, bottomY + 5);
    const controlX = (tx) * 0.4 + Math.sin(i * 1.5) * 8;
    ctxBraid.quadraticCurveTo(controlX, bottomY + 22, tx, bottomY + 48);
    ctxBraid.strokeStyle = color;
    ctxBraid.lineWidth = 3.5;
    ctxBraid.lineCap = 'round';
    
    ctxBraid.shadowColor = 'rgba(0,0,0,0.1)';
    ctxBraid.shadowBlur = 2;
    ctxBraid.shadowOffsetY = 2;
    
    ctxBraid.stroke();
  }
  ctxBraid.restore();
  
  ctxBraid.restore(); // Restore global scaling matrix
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

  // Settings: Braid Zoom
  const settingsZoom = document.getElementById('settings-braid-zoom');
  const settingsZoomVal = document.getElementById('settings-braid-zoom-val');
  if (settingsZoom) {
    settingsZoom.addEventListener('input', (e) => {
      braidZoom = parseFloat(e.target.value);
      if (settingsZoomVal) settingsZoomVal.textContent = `${Math.round(braidZoom * 100)}%`;
      renderAll();
    });
  }

  // Settings: Pitch
  const settingsPitch = document.getElementById('settings-pitch');
  const settingsPitchVal = document.getElementById('settings-pitch-val');
  if (settingsPitch) {
    settingsPitch.addEventListener('input', (e) => {
      braidPitch = parseFloat(e.target.value);
      if (settingsPitchVal) settingsPitchVal.textContent = braidPitch.toFixed(1);
      renderAll();
    });
  }

  // Settings: Strand Width
  const settingsStrandWidth = document.getElementById('settings-strand-width');
  const settingsStrandWidthVal = document.getElementById('settings-strand-width-val');
  if (settingsStrandWidth) {
    settingsStrandWidth.addEventListener('input', (e) => {
      strandWidthRatio = parseFloat(e.target.value);
      if (settingsStrandWidthVal) settingsStrandWidthVal.textContent = strandWidthRatio.toFixed(2);
      renderAll();
    });
  }

  // Settings: Speed
  const settingsSpeed = document.getElementById('settings-speed');
  if (settingsSpeed) {
    settingsSpeed.addEventListener('change', (e) => {
      playSpeed = parseInt(e.target.value);
    });
  }

  // Settings: Max Steps
  const settingsMaxSteps = document.getElementById('settings-max-steps');
  if (settingsMaxSteps) {
    settingsMaxSteps.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 10) val = 10;
      if (val > 1000) val = 1000;
      e.target.value = val;
      MAX_STEPS = val;
      progressBar.max = MAX_STEPS;
      if (currentStep > MAX_STEPS) {
        currentStep = MAX_STEPS;
        resetSimulationToStep(currentStep);
      }
      updatePlaybackUI();
      renderAll();
    });
  }

  // i18n Language toggle clicks
  btnLangKo.addEventListener('click', () => setLanguage('ko'));
  btnLangEn.addEventListener('click', () => setLanguage('en'));

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

  // 3. Playback Controls
  btnPlay.addEventListener('click', togglePlay);
  
  btnNext.addEventListener('click', () => {
    if (currentStep < MAX_STEPS) {
      try {
        disk.weaveRow();
        currentStep = disk.rowIndex;
        updatePlaybackUI();
        renderAll();
      } catch (err) {
        showToast(`${currentLang === 'ko' ? '오류' : 'Error'}: ${err.message}`);
      }
    } else {
      showToast(TRANSLATIONS[currentLang].toastStepComplete);
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      resetSimulationToStep(currentStep);
      renderAll();
    }
  });

  btnFirst.addEventListener('click', () => {
    currentStep = 0;
    resetSimulationToStep(currentStep);
    renderAll();
  });

  btnLast.addEventListener('click', () => {
    currentStep = MAX_STEPS;
    resetSimulationToStep(currentStep);
    renderAll();
  });

  progressBar.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    currentStep = val;
    resetSimulationToStep(currentStep);
    renderAll();
  });

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
      const templateNameKo = activeTemplate.name_ko || activeTemplate.name_en;
      const templateNameEn = activeTemplate.name_en || activeTemplate.name_ko;

      await addDoc(collection(db, 'patterns'), {
        templateId: activeTemplate.id,
        templateName: activeTemplate.name_en,
        nameKo: templateNameKo,
        nameEn: templateNameEn,
        nThreads: disk.nThreads,
        maxSteps: MAX_STEPS,
        colors: [...threadColors],
        ownerUid: currentUser.uid,
        createdAt: serverTimestamp()
      });

      showToast(t.toastSaveGallery);
    } catch (err) {
      console.error('Error saving to gallery:', err);
      showToast(t.toastSaveGalleryError);
    } finally {
      btnSaveGallery.disabled = false;
    }
  });

  btnSaveLocal.addEventListener('click', () => {
    const data = getExportData();
    localStorage.setItem('palzzi-saved-profile', JSON.stringify(data));
    showToast(TRANSLATIONS[currentLang].toastSaveLocal);
  });

  btnLoadLocal.addEventListener('click', () => {
    const saved = localStorage.getItem('palzzi-saved-profile');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        loadExportData(data);
        showToast(TRANSLATIONS[currentLang].toastLoadLocal);
      } catch (err) {
        showToast(currentLang === 'ko' ? "불러오기 실패: 데이터가 오염되었습니다." : "Failed to load: Corrupted profile data.");
      }
    } else {
      showToast(TRANSLATIONS[currentLang].toastNoLocal);
    }
  });

  btnShareUrl.addEventListener('click', () => {
    const hexArray = threadColors.map(c => c.replace('#', ''));
    const shareUrl = `${window.location.origin}${window.location.pathname}?tmpl=${activeTemplate.id}&colors=${hexArray.join(',')}&step=${currentStep}`;
    
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
    const a = document.createElement('a');
    a.href = braidCanvas.toDataURL('image/png');
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

  // 6. View Tabs Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = `tab-${btn.dataset.tab}`;
      document.getElementById(targetId).classList.add('active');
      renderAll();
    });
  });
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
      colors: [...threadColors],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user colors to Firestore:', err);
  }
}

async function loadUserColorsFromFirestore() {
  if (!currentUser) return;
  try {
    const userDocRef = doc(db, 'userColors', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Only load colors if the template matches
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
    projectName: activeTemplate.name_en, // export english name as default
    craftType: "KUMIHIMO_ROUND",
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
    let foundTmpl = KUMIHIMO_TEMPLATES.find(t => t.threads === threadsCount);
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

// --- Playback Loop ---

function togglePlay() {
  if (isPlaying) {
    clearInterval(playInterval);
    isPlaying = false;
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    showToast(TRANSLATIONS[currentLang].toastAutoplayPause);
  } else {
    if (currentStep >= MAX_STEPS) {
      currentStep = 0;
      resetSimulationToStep(0);
    }
    
    isPlaying = true;
    btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    showToast(TRANSLATIONS[currentLang].toastAutoplayStart);
    
    const intervalTime = parseInt(document.getElementById('settings-speed')?.value || '250', 10);
    playInterval = setInterval(() => {
      if (currentStep < MAX_STEPS) {
        try {
          disk.weaveRow();
          currentStep = disk.rowIndex;
          updatePlaybackUI();
          renderAll();
        } catch (err) {
          clearInterval(playInterval);
          isPlaying = false;
          btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
          showToast(`${TRANSLATIONS[currentLang].toastStopError}${err.message}`);
        }
      } else {
        clearInterval(playInterval);
        isPlaying = false;
        btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
        showToast(TRANSLATIONS[currentLang].toastStepComplete);
      }
    }, intervalTime);
  }
}

// Check for parameters in the URL to restore sharing state
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tmplId = params.get('tmpl');
  const colorsParam = params.get('colors');
  const stepParam = params.get('step');
  
  if (tmplId) {
    const tmpl = KUMIHIMO_TEMPLATES.find(t => t.id === tmplId);
    if (tmpl) {
      let colors = null;
      if (colorsParam) {
        colors = colorsParam.split(',').map(c => `#${c}`);
      }
      loadTemplate(tmpl, colors);
      
      if (stepParam) {
        const step = parseInt(stepParam, 10);
        if (!isNaN(step) && step >= 0 && step <= MAX_STEPS) {
          currentStep = step;
          resetSimulationToStep(currentStep);
        }
      }
      renderAll();
      showToast(currentLang === 'ko' ? "공유된 상태를 불러왔습니다!" : "Successfully loaded shared pattern state!");
    }
  }
}

// Run Initial setup on page load
window.addEventListener('DOMContentLoaded', init);

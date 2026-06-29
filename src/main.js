import { KumihimoDisk } from './engine/kumihimo.js';
import { KUMIHIMO_TEMPLATES } from './templates/templates.js';

// Application State
let disk = new KumihimoDisk(8);
let activeTemplate = KUMIHIMO_TEMPLATES[2]; // Default: 8-Strand Candy Cane
let threadColors = [...activeTemplate.defaultColors];
let currentStep = 0;
const MAX_STEPS = 120;
let isPlaying = false;
let playInterval = null;
let selectedThreadIndex = -1; // Index in the active threads (0 to nThreads-1)
let braidZoom = 0.70; // Braid viewer scale level. Default is zoom out 70% (UX upgrade)
let braidPitch = 4.3; // Braid weaving compactness pitch spacing (UX Upgrade)

// Color Presets Manager State (doc/7_UI)
let presetColors = [
  { name: "레드", hex: "#FF3B30" },
  { name: "오렌지", hex: "#FF9500" },
  { name: "옐로우", hex: "#FFCC00" },
  { name: "그린", hex: "#4CD964" },
  { name: "아쿠아", hex: "#5AC8FA" },
  { name: "블루", hex: "#007AFF" },
  { name: "퍼플", hex: "#5856D6" },
  { name: "핑크", hex: "#FF2D55" },
  { name: "화이트", hex: "#FFFFFF" },
  { name: "다크 그레이", hex: "#1D1D1F" }
];
let editingPresetIndex = -1; // -1 for "Add New", >=0 for "Edit Existing"

// Interactive Drag & Drop variables
let isDragging = false;
let dragThreadIdx = -1; // Index in state (0 to 31)
let dragMousePos = { x: 0, y: 0 };
let dragTargetSlot = -1;

// DOM Elements
const templateSelect = document.getElementById('template-select');
const templateDesc = document.getElementById('template-desc');
const metaThreads = document.getElementById('meta-threads');
const metaDifficulty = document.getElementById('meta-difficulty');
const threadListContainer = document.getElementById('thread-list');
const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
const presetColorsContainer = document.getElementById('preset-colors-container');
const toastMessage = document.getElementById('toast-message');

// Modal Elements (doc/7_UI)
const btnManagePresets = document.getElementById('btn-manage-presets');
const presetModal = document.getElementById('preset-modal');
const modalClose = document.getElementById('modal-close');
const btnModalCloseDone = document.getElementById('btn-modal-close-done');
const modalPresetColor = document.getElementById('modal-preset-color');
const modalPresetHex = document.getElementById('modal-preset-hex');
const modalPresetR = document.getElementById('modal-preset-r');
const modalPresetG = document.getElementById('modal-preset-g');
const modalPresetB = document.getElementById('modal-preset-b');
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
const speedSelect = document.getElementById('speed-select');

// Storage & Export Buttons
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

// --- Initialization ---
function init() {
  // Load custom color presets from localStorage if saved (doc/7_UI)
  const localPresets = localStorage.getItem('palzzi-custom-presets');
  if (localPresets) {
    try {
      presetColors = JSON.parse(localPresets);
    } catch (e) {
      console.error("Error loading custom presets from storage:", e);
    }
  }

  setupTemplateDropdown();
  loadTemplate(activeTemplate);
  setupEventListeners();
  checkUrlParams();
  
  // Render initially
  renderPresetColors();
  renderAll();
}

// Populate templates into select dropdown
function setupTemplateDropdown() {
  templateSelect.innerHTML = '';
  KUMIHIMO_TEMPLATES.forEach(tmpl => {
    const opt = document.createElement('option');
    opt.value = tmpl.id;
    opt.textContent = tmpl.name;
    templateSelect.appendChild(opt);
  });
  templateSelect.value = activeTemplate.id;
}

// Load selected template
function loadTemplate(tmpl, customColors = null) {
  activeTemplate = tmpl;
  disk = new KumihimoDisk(tmpl.threads);
  threadColors = customColors ? [...customColors] : [...tmpl.defaultColors];
  
  // Adjust progress bar
  progressBar.max = MAX_STEPS;
  currentStep = 0;
  progressBar.value = 0;
  
  selectedThreadIndex = 0; // Default to first thread
  
  // Reset engine disk state
  resetSimulationToStep(currentStep);

  // Update UI Elements
  templateDesc.textContent = tmpl.description;
  metaThreads.innerHTML = `<i class="fa-solid fa-braille"></i> ${tmpl.threads} 가닥`;
  
  let diff = "쉬움";
  if (tmpl.threads >= 12) diff = "어려움";
  else if (tmpl.threads >= 8) diff = "보통";
  metaDifficulty.innerHTML = `<i class="fa-solid fa-gauge-simple-high"></i> ${diff}`;
  
  // Refresh color controls
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

// --- Color Presets Manager Business Logic (doc/7_UI) ---

// Render color presets circle buttons on the left panel
function renderPresetColors() {
  presetColorsContainer.innerHTML = '';
  presetColors.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.style.backgroundColor = preset.hex;
    btn.title = `${preset.name} (${preset.hex})`;
    btn.dataset.color = preset.hex;
    
    btn.addEventListener('click', () => {
      colorPicker.value = preset.hex;
      colorHex.value = preset.hex;
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

// Render dynamic preset list inside the modal
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
    nameSpan.textContent = preset.name;
    
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
    editBtn.title = '수정';
    editBtn.addEventListener('click', () => startEditPreset(idx));
    
    // Delete Action Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-action btn-action-delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.title = '삭제';
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
  modalPresetName.value = preset.name;
  
  const rgb = hexToRgb(preset.hex);
  modalPresetR.value = rgb.r;
  modalPresetG.value = rgb.g;
  modalPresetB.value = rgb.b;
  
  formTitle.textContent = `프리셋 수정 (#${idx + 1})`;
  btnModalCancelEdit.classList.remove('hidden');
  btnModalSave.textContent = '수정 완료';
}

// Reset Form to New Preset addition mode
function cancelEditPreset() {
  editingPresetIndex = -1;
  
  modalPresetColor.value = '#007AFF';
  modalPresetHex.value = '#007AFF';
  modalPresetName.value = '애플 블루';
  
  modalPresetR.value = 0;
  modalPresetG.value = 122;
  modalPresetB.value = 255;
  
  formTitle.textContent = '새 프리셋 추가';
  btnModalCancelEdit.classList.add('hidden');
  btnModalSave.textContent = '저장';
}

// Delete existing preset
function deletePreset(idx) {
  const deletedName = presetColors[idx].name;
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
  showToast(`프리셋 "${deletedName}" 삭제됨`);
}

// Save presets to localStorage
function savePresetsToStorage() {
  localStorage.setItem('palzzi-custom-presets', JSON.stringify(presetColors));
}

// Save Form (Add or Edit)
function savePreset() {
  const name = modalPresetName.value.trim();
  if (!name) {
    showToast("색상 이름을 입력해주세요!");
    return;
  }
  
  const hex = modalPresetHex.value.trim();
  if (!/^#[0-9A-F]{6}$/i.test(hex)) {
    showToast("올바른 HEX 컬러 코드를 입력해주세요. (예: #FF5733)");
    return;
  }
  
  const preset = { name, hex };
  
  if (editingPresetIndex === -1) {
    // Add New mode
    presetColors.push(preset);
    showToast(`프리셋 "${name}" 등록 완료!`);
  } else {
    // Edit mode
    presetColors[editingPresetIndex] = preset;
    showToast(`프리셋 "${name}" 수정 완료!`);
  }
  
  cancelEditPreset();
  savePresetsToStorage();
  renderModalPresetList();
  renderPresetColors();
}

// Refresh active threads colors list on the left panel
function populateThreadList() {
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
    num.textContent = `실 ${i + 1}`;
    
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
  if (selectedThreadIndex >= 0 && selectedThreadIndex < threadColors.length) {
    const color = threadColors[selectedThreadIndex];
    colorPicker.value = color;
    colorHex.value = color;
  }
}

function updatePlaybackUI() {
  stepCounter.textContent = `Step ${currentStep} / ${MAX_STEPS}`;
  progressBar.value = currentStep;
  progressPercentage.textContent = `${Math.round((currentStep / MAX_STEPS) * 100)}%`;
  
  // Generate user guide text based on the next move
  updateGuideText();
}

function updateGuideText() {
  if (currentStep >= MAX_STEPS) {
    guideText.textContent = "직조 완료! 수고하셨습니다. 도안을 저장하세요!";
    return;
  }
  
  // Find current active group on the disk to guide the user
  const nPairs = disk.nThreads / 2;
  const repeatCount = Math.max(1, nPairs / 2);
  const distance = disk.slotsCount / nPairs;
  
  const startPos = (disk.slotsCount - disk.rowIndex) % disk.slotsCount;
  
  // Let's check which sub-step in this row is remaining.
  // Since we weave the whole row at once in weaveRow(), we can guide the overall motion
  // For simplicity, describe the main swap on the primary pair
  const tl = startPos;
  const tr = (startPos + 1) % disk.slotsCount;
  const br = (startPos + (disk.slotsCount / 2)) % disk.slotsCount;
  const bl = (br + 1) % disk.slotsCount;
  
  const trSlot = tr + 1;
  const targetBrSlot = ((br - 1 + disk.slotsCount) % disk.slotsCount) + 1;
  
  guideText.textContent = `[우측 상단] ${trSlot}번 슬롯 실을 아래 ${targetBrSlot}번으로 이동시켜 시작하세요.`;
}

// --- Renderers ---

function renderAll() {
  drawDisk();
  drawBraid();
  drawChart();
}

/**
 * Draw 32-slot Kumihimo Disk
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

  // 6. Draw currently dragging thread if any
  if (isDragging && dragThreadIdx !== -1) {
    const color = disk.state[dragThreadIdx].color;
    ctxDisk.save();
    ctxDisk.beginPath();
    ctxDisk.moveTo(cx, cy);
    ctxDisk.lineTo(dragMousePos.x, dragMousePos.y);
    ctxDisk.strokeStyle = color;
    ctxDisk.lineWidth = 10;
    ctxDisk.lineCap = 'round';
    ctxDisk.stroke();
    
    // Terminal ball
    ctxDisk.beginPath();
    ctxDisk.arc(dragMousePos.x, dragMousePos.y, 12, 0, 2 * Math.PI);
    ctxDisk.fillStyle = color;
    ctxDisk.fill();
    ctxDisk.strokeStyle = '#ffffff';
    ctxDisk.lineWidth = 2;
    ctxDisk.stroke();
    ctxDisk.restore();

    // Draw active target slot highligting
    if (dragTargetSlot !== -1) {
      const angle = (dragTargetSlot * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
      const tx = cx + (rDisk - 15) * Math.cos(angle);
      const ty = cy + (rDisk - 15) * Math.sin(angle);
      ctxDisk.beginPath();
      ctxDisk.arc(tx, ty, 18, 0, 2 * Math.PI);
      ctxDisk.fillStyle = 'rgba(0, 122, 255, 0.2)';
      ctxDisk.strokeStyle = '#007aff';
      ctxDisk.lineWidth = 2;
      ctxDisk.fill();
      ctxDisk.stroke();
    }
  }
}

// Function to check if a specific slot index is mapped to the current selected thread colors index
function isThreadSelectedAtSlot(slotIdx) {
  const nPairs = disk.nThreads / 2;
  const distance = disk.slotsCount / nPairs;

  // Find original index
  for (let i = 0; i < nPairs; i++) {
    const idx1 = Math.round(i * distance) % disk.slotsCount;
    const idx2 = (idx1 + 1) % disk.slotsCount;

    if (idx1 === slotIdx && (i * 2) === selectedThreadIndex) return true;
    if (idx2 === slotIdx && (i * 2 + 1) === selectedThreadIndex) return true;
  }
  return false;
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
    ctxBraid.fillText('직조를 시작하면', cx, height / 2);
    ctxBraid.fillText('여기에 3D 나선형 꼬임 완성본이', cx, height / 2 + 20);
    ctxBraid.fillText('실시간으로 렌더링됩니다.', cx, height / 2 + 40);
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

  // Draw top hanger loop or starting knot for aesthetic charm
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
  
  const maxVisibleRows = Math.floor((height - 80) / pitch);
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
    
    // Compute thread thickness - slightly higher scaling multiplier for full gap coverage
    const thick = (2 * Math.PI * radius / nThreads) * 0.76;
    const strandWidth = Math.max(4, Math.min(18, thick));
    
    ctxBraid.lineWidth = strandWidth;
    ctxBraid.lineCap = 'round';
    
    // Calculate realistic lighting factor based on Z-depth (center is bright, sides are dark)
    // This removes the grey overlay box entirely and makes colors extremely vivid and glowing!
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
function mapDiskSlotToThreadColorIdx(slotIdx) {
  const nPairs = disk.nThreads / 2;
  const distance = disk.slotsCount / nPairs;
  
  for (let i = 0; i < nPairs; i++) {
    const idx1 = Math.round(i * distance) % disk.slotsCount;
    const idx2 = (idx1 + 1) % disk.slotsCount;
    if (idx1 === slotIdx) return i * 2;
    if (idx2 === slotIdx) return i * 2 + 1;
  }
  return -1;
}

// Identify which slot notch was hovered during drag
function getNotchIndexFromCoords(mx, my) {
  const cx = diskCanvas.width / 2;
  const cy = diskCanvas.height / 2;
  const rDisk = 180;
  
  for (let i = 0; i < disk.slotsCount; i++) {
    const angle = (i * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
    const xSlot = cx + rDisk * Math.cos(angle);
    const ySlot = cy + rDisk * Math.sin(angle);
    const dist = Math.hypot(mx - xSlot, my - ySlot);
    if (dist < 20) {
      return i;
    }
  }
  return -1;
}

// Validate if the drag-and-drop motion corresponds to the active guided step rules
function validateDragMove(fromSlot, toSlot) {
  if (currentStep >= MAX_STEPS) return false;
  
  const nPairs = disk.nThreads / 2;
  const startPos = (disk.slotsCount - disk.rowIndex) % disk.slotsCount;
  
  const tl = startPos;
  const tr = (startPos + 1) % disk.slotsCount;
  const br = (startPos + (disk.slotsCount / 2)) % disk.slotsCount;
  const bl = (br + 1) % disk.slotsCount;
  
  const targetBr = (br - 1 + disk.slotsCount) % disk.slotsCount;
  const targetTl = (tl - 1 + disk.slotsCount) % disk.slotsCount;
  
  // Either Top-Right to Bottom-Right - 1, OR Bottom-Left to Top-Left - 1
  if (fromSlot === tr && toSlot === targetBr) return 'TR';
  if (fromSlot === bl && toSlot === targetTl) return 'BL';
  
  return null;
}

// Show temporary feedback toast message
function showToast(msg) {
  toastMessage.textContent = msg;
  toastMessage.classList.remove('hidden');
  setTimeout(() => {
    toastMessage.classList.add('hidden');
  }, 2500);
}

// --- Events Setup ---
function setupEventListeners() {

  // Braid Zoom Controller (UX Upgrade)
  const braidZoomSlider = document.getElementById('braid-zoom-slider');
  const braidZoomVal = document.getElementById('braid-zoom-val');
  if (braidZoomSlider) {
    braidZoomSlider.addEventListener('input', (e) => {
      braidZoom = parseFloat(e.target.value);
      if (braidZoomVal) braidZoomVal.textContent = `${Math.round(braidZoom * 100)}%`;
      renderAll();
    });
  }

  // Braid Weaving Pitch Controller (UX Upgrade)
  const braidPitchSlider = document.getElementById('braid-pitch-slider');
  const braidPitchVal = document.getElementById('braid-pitch-val');
  if (braidPitchSlider) {
    braidPitchSlider.addEventListener('input', (e) => {
      braidPitch = parseFloat(e.target.value);
      if (braidPitchVal) braidPitchVal.textContent = braidPitch.toFixed(1);
      renderAll();
    });
  }

  // Preset Manager Modal Control (doc/7_UI)
  btnManagePresets.addEventListener('click', () => {
    presetModal.classList.remove('hidden');
    renderModalPresetList();
    cancelEditPreset();
  });

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

  // Modal Color Picker -> HEX / RGB Sync
  modalPresetColor.addEventListener('input', (e) => {
    const hex = e.target.value;
    modalPresetHex.value = hex;
    const rgb = hexToRgb(hex);
    modalPresetR.value = rgb.r;
    modalPresetG.value = rgb.g;
    modalPresetB.value = rgb.b;
  });

  // Modal HEX Text -> Color Picker / RGB Sync
  modalPresetHex.addEventListener('input', (e) => {
    const hex = e.target.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      modalPresetColor.value = hex;
      const rgb = hexToRgb(hex);
      modalPresetR.value = rgb.r;
      modalPresetG.value = rgb.g;
      modalPresetB.value = rgb.b;
    }
  });

  // Modal RGB Inputs -> Color Picker / HEX Sync
  const syncFromRgbInputs = () => {
    const r = parseInt(modalPresetR.value, 10) || 0;
    const g = parseInt(modalPresetG.value, 10) || 0;
    const b = parseInt(modalPresetB.value, 10) || 0;
    
    // Bounds clamping
    const clampedR = Math.max(0, Math.min(255, r));
    const clampedG = Math.max(0, Math.min(255, g));
    const clampedB = Math.max(0, Math.min(255, b));
    
    modalPresetR.value = clampedR;
    modalPresetG.value = clampedG;
    modalPresetB.value = clampedB;

    const hex = rgbToHex(clampedR, clampedG, clampedB);
    modalPresetColor.value = hex;
    modalPresetHex.value = hex;
  };

  modalPresetR.addEventListener('input', syncFromRgbInputs);
  modalPresetG.addEventListener('input', syncFromRgbInputs);
  modalPresetB.addEventListener('input', syncFromRgbInputs);

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
      showToast(`${tmpl.name} 로드됨`);
    }
  });

  // 2. Color customizer change
  colorPicker.addEventListener('input', (e) => {
    const newColor = e.target.value;
    colorHex.value = newColor;
    updateSelectedThreadColor(newColor);
  });
  
  colorHex.addEventListener('change', (e) => {
    let newColor = e.target.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      colorPicker.value = newColor;
      updateSelectedThreadColor(newColor);
    } else {
      showToast("올바른 HEX 컬러 코드를 입력해주세요. (예: #FF5733)");
    }
  });

  // Preset color buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      colorPicker.value = color;
      colorHex.value = color;
      updateSelectedThreadColor(color);
    });
  });

  function updateSelectedThreadColor(color) {
    if (selectedThreadIndex >= 0 && selectedThreadIndex < threadColors.length) {
      threadColors[selectedThreadIndex] = color;
      populateThreadList();
      resetSimulationToStep(currentStep);
      renderAll();
    }
  }

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
        showToast(`오류: ${err.message}`);
      }
    } else {
      showToast("이미 모든 단계가 짜였습니다!");
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
  btnSaveLocal.addEventListener('click', () => {
    const data = getExportData();
    localStorage.setItem('palzzi-saved-profile', JSON.stringify(data));
    showToast("브라우저 내 보관함에 저장되었습니다!");
  });

  btnLoadLocal.addEventListener('click', () => {
    const saved = localStorage.getItem('palzzi-saved-profile');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        loadExportData(data);
        showToast("보관함 데이터를 성공적으로 복구했습니다!");
      } catch (err) {
        showToast("불러오기 실패: 데이터가 오염되었습니다.");
      }
    } else {
      showToast("저장된 보관함 데이터가 없습니다.");
    }
  });

  btnShareUrl.addEventListener('click', () => {
    const hexArray = threadColors.map(c => c.replace('#', ''));
    const shareUrl = `${window.location.origin}${window.location.pathname}?tmpl=${activeTemplate.id}&colors=${hexArray.join(',')}&step=${currentStep}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("공유 링크가 클립보드에 복사되었습니다!");
    }).catch(() => {
      showToast("링크 복사 실패. 브라우저 보안 설정을 확인해 주세요.");
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
    showToast("JSON 파일 저장 완료!");
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
        showToast("JSON 설정 불러오기 완료!");
      } catch (err) {
        showToast("오류: 올바르지 않은 JSON 파일입니다.");
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
    showToast("도안 차트 고해상도 PNG 다운로드 완료!");
  });

  btnExportPngBraid.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = braidCanvas.toDataURL('image/png');
    a.download = `palzzi-finished-${activeTemplate.id}-step${currentStep}.png`;
    a.click();
    showToast("완성 이미지 PNG 다운로드 완료!");
  });

  // 5. Canvas mouse/touch drag events for interactive braiding
  diskCanvas.addEventListener('mousedown', onDragStart);
  diskCanvas.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  
  // Touch support for mobile devices
  diskCanvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = diskCanvas.getBoundingClientRect();
    onDragStart({
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    });
  }, { passive: false });

  diskCanvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    onDragMove({
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    });
  }, { passive: false });

  window.addEventListener('touchend', () => {
    onDragEnd();
  });

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

function onDragStart(e) {
  const rect = diskCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (diskCanvas.width / rect.width);
  const my = (e.clientY - rect.top) * (diskCanvas.height / rect.height);
  
  const slotIdx = getThreadIndexFromCoords(mx, my);
  if (slotIdx !== -1) {
    if (e.preventDefault) e.preventDefault();
    
    // Select this thread in left list
    const mappedColorIdx = mapDiskSlotToThreadColorIdx(slotIdx);
    if (mappedColorIdx !== -1) {
      selectedThreadIndex = mappedColorIdx;
      populateThreadList();
      updateColorPickerUI();
    }
    
    // Check if we can initiate drag
    if (currentStep < MAX_STEPS) {
      const nPairs = disk.nThreads / 2;
      const startPos = (disk.slotsCount - disk.rowIndex) % disk.slotsCount;
      const tr = (startPos + 1) % disk.slotsCount;
      const bl = (startPos + (disk.slotsCount / 2) + 1) % disk.slotsCount;
      
      // We only allow dragging TR or BL of the current step
      if (slotIdx === tr || slotIdx === bl) {
        isDragging = true;
        dragThreadIdx = slotIdx;
        dragMousePos = { x: mx, y: my };
        dragTargetSlot = -1;
        renderAll();
      }
    }
  }
}

function onDragMove(e) {
  if (!isDragging) return;
  if (e.preventDefault) e.preventDefault();
  
  const rect = diskCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (diskCanvas.width / rect.width);
  const my = (e.clientY - rect.top) * (diskCanvas.height / rect.height);
  
  dragMousePos = { x: mx, y: my };
  
  // Find hover notch
  const hoverNotch = getNotchIndexFromCoords(mx, my);
  if (hoverNotch !== -1) {
    const moveType = validateDragMove(dragThreadIdx, hoverNotch);
    if (moveType) {
      dragTargetSlot = hoverNotch;
    } else {
      dragTargetSlot = -1;
    }
  } else {
    dragTargetSlot = -1;
  }
  
  renderAll();
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  
  if (dragTargetSlot !== -1) {
    // A correct step is dragged! 
    // We execute weaveRow() since the user completed the pairing gesture!
    // In our manual single drag, we automatically complete the paired step for ease of use.
    try {
      disk.weaveRow();
      currentStep = disk.rowIndex;
      updatePlaybackUI();
      showToast("직조 한 단계 성공!");
    } catch (err) {
      showToast(`직조 실패: ${err.message}`);
    }
  }
  
  dragThreadIdx = -1;
  dragTargetSlot = -1;
  renderAll();
}

// --- Data Import/Export Schemas ---

function getExportData() {
  return {
    projectId: `palzzi-${activeTemplate.id}-${Date.now()}`,
    projectName: activeTemplate.name,
    craftType: "KUMIHIMO_ROUND",
    meta: {
      totalThreads: disk.nThreads,
      diskSlots: 32,
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
        name: `${threadsCount}줄 커스텀 패턴`,
        threads: threadsCount,
        description: `사용자 지정 ${threadsCount}줄 쿠미히모 패턴입니다.`,
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
    showToast("일시정지됨");
  } else {
    if (currentStep >= MAX_STEPS) {
      currentStep = 0;
      resetSimulationToStep(0);
    }
    
    isPlaying = true;
    btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    showToast("자동 재생 시작");
    
    const intervalTime = parseInt(speedSelect.value, 10);
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
          showToast(`오류로 정지: ${err.message}`);
        }
      } else {
        clearInterval(playInterval);
        isPlaying = false;
        btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
        showToast("직조 완료!");
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
      showToast("공유된 상태를 불러왔습니다!");
    }
  }
}

// Run Initial setup on page load
window.addEventListener('DOMContentLoaded', init);

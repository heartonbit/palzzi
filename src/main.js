/**
 * Palzzi - Kumihimo Braid Simulator
 * Main application entry point.
 */
import { initDisk, weaveRow, weaveRows, snapshot, restore, getPatternChart, DISK_SLOTS } from './engine/kumihimo.js';
import TEMPLATES from './templates/templates.js';

// ─── State ────────────────────────────────────────────────
let kumiState = null;
let currentStep = 0;
let totalSteps = 120;
let isPlaying = false;
let playInterval = null;
let currentTemplate = null;
let selectedSlotIndex = -1;
let viewMode = 'disk'; // 'disk' or 'chart'
let history = [];

// ─── DOM References ───────────────────────────────────────
const $ = (id) => document.getElementById(id);

const templateSelect = $('template-select');
const btnApplyTemplate = $('btn-apply-template');
const threadCountBtns = document.querySelectorAll('.btn-thread-count');
const colorSlots = $('color-slots');
const colorPicker = $('color-picker');
const btnSetColor = $('btn-set-color');
const diskCanvas = $('disk-canvas');
const chartCanvas = $('chart-canvas');
const previewCanvas = $('preview-canvas');
const btnFirst = $('btn-first');
const btnPrev = $('btn-prev');
const btnPlay = $('btn-play');
const btnNext = $('btn-next');
const btnLast = $('btn-last');
const stepIndicator = $('step-indicator');
const speedSelect = $('speed-select');
const progressFill = $('progress-fill');
const progressBar = $('progress-bar');
const tabs = document.querySelectorAll('.tab');
const btnExportPng = $('btn-export-png');
const btnExportSvg = $('btn-export-svg');
const btnExportJson = $('btn-export-json');
const btnSaveLocal = $('btn-save-local');
const btnLoadLocal = $('btn-load-local');
const btnShareUrl = $('btn-share-url');

// ─── Templates ────────────────────────────────────────────
function populateTemplates() {
  templateSelect.innerHTML = '';
  TEMPLATES.forEach(t => {
    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = `${t.name} (${t.nThreads}줄)`;
    templateSelect.appendChild(option);
  });
}

function applyTemplate(templateId) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return;

  currentTemplate = template;
  kumiState = initDisk([...template.colors]);
  currentStep = 0;
  totalSteps = 120;
  history = [snapshot(kumiState)];
  selectedSlotIndex = -1;

  // Update thread count buttons
  threadCountBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count) === template.nThreads);
  });

  updateColorEditor();
  renderAll();
  updateControls();
}

// ─── Thread Count ─────────────────────────────────────────
function changeThreadCount(count) {
  if (currentTemplate) {
    // Take current colors and adjust to new count
    const colors = getCurrentColors();
    const newColors = [];
    for (let i = 0; i < count; i++) {
      newColors.push(colors[i % colors.length]);
    }
    kumiState = initDisk(newColors);
  } else {
    const defaultColors = generateDefaultColors(count);
    kumiState = initDisk(defaultColors);
  }

  currentStep = 0;
  totalSteps = 120;
  history = [snapshot(kumiState)];
  selectedSlotIndex = -1;

  threadCountBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
  });

  updateColorEditor();
  renderAll();
  updateControls();
}

function generateDefaultColors(n) {
  const hues = [0, 30, 60, 120, 200, 260, 300, 340];
  const colors = [];
  for (let i = 0; i < n; i++) {
    const hue = hues[i % hues.length];
    colors.push(`hsl(${hue}, 80%, 55%)`);
  }
  return colors;
}

function getCurrentColors() {
  if (!kumiState) return [];
  const colors = [];
  for (let i = 0; i < kumiState.nThreads; i++) {
    const idx = (i * kumiState.stride);
    colors.push(kumiState.state[idx]);
  }
  return colors;
}

// ─── Color Editor ─────────────────────────────────────────
function updateColorEditor() {
  if (!kumiState) return;
  const colors = getCurrentColors();
  
  colorSlots.innerHTML = '';
  colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (i === selectedSlotIndex ? ' selected' : '');
    swatch.style.backgroundColor = color;
    swatch.title = `실 ${i + 1}: ${color}`;
    swatch.dataset.index = i;
    swatch.addEventListener('click', () => {
      selectedSlotIndex = i;
      updateColorEditor();
      colorPicker.value = colorToHex(color);
    });
    colorSlots.appendChild(swatch);
  });
}

function colorToHex(color) {
  if (color.startsWith('#')) return color;
  // Convert hsl to hex for the color picker
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

btnSetColor.addEventListener('click', () => {
  if (selectedSlotIndex < 0 || !kumiState) return;
  const newColor = colorPicker.value;
  const idx = selectedSlotIndex * kumiState.stride;
  // Update both threads in the pair
  kumiState.state[idx] = newColor;
  kumiState.state[idx + 1] = newColor;
  
  // Reset state (re-init with new colors)
  const colors = getCurrentColors();
  kumiState = initDisk(colors);
  currentStep = 0;
  history = [snapshot(kumiState)];
  updateColorEditor();
  renderAll();
  updateControls();
});

// ─── Weave Controls ───────────────────────────────────────
function doWeave(steps = 1) {
  if (!kumiState) return;
  
  for (let i = 0; i < steps; i++) {
    if (currentStep >= totalSteps) break;
    try {
      weaveRow(kumiState);
      currentStep++;
      history.push(snapshot(kumiState));
      // Trim history if we branched
      history = history.slice(0, currentStep + 1);
    } catch (e) {
      console.error('Weave error:', e);
      break;
    }
  }
  
  renderAll();
  updateControls();
}

function goToStep(step) {
  if (!kumiState || step < 0 || step >= history.length) return;
  
  const snap = history[step];
  restore(kumiState, snap);
  currentStep = step;
  
  renderAll();
  updateControls();
}

function goToFirst() {
  goToStep(0);
}

function goToPrev() {
  if (currentStep > 0) goToStep(currentStep - 1);
}

function goToNext() {
  if (currentStep < history.length - 1) {
    goToStep(currentStep + 1);
  } else if (currentStep < totalSteps) {
    doWeave(1);
  }
}

function goToLast() {
  // Weave until we reach totalSteps
  while (currentStep < totalSteps) {
    doWeave(10);
  }
}

function togglePlay() {
  if (isPlaying) {
    stopPlay();
  } else {
    startPlay();
  }
}

function startPlay() {
  if (currentStep >= totalSteps) {
    goToFirst();
  }
  isPlaying = true;
  btnPlay.textContent = '⏸';
  const speed = parseFloat(speedSelect.value);
  const interval = 1000 / speed;
  
  playInterval = setInterval(() => {
    if (currentStep >= totalSteps) {
      stopPlay();
      return;
    }
    goToNext();
  }, 200 / speed);
}

function stopPlay() {
  isPlaying = false;
  btnPlay.textContent = '▶';
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

// ─── Rendering ────────────────────────────────────────────
function renderAll() {
  renderDisk();
  renderChart();
  renderPreview();
  updateStepIndicator();
}

function renderDisk() {
  if (!kumiState) return;
  const canvas = diskCanvas;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(rect.width - 32, rect.height - 32, 500);
  
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;
  
  // Clear
  ctx.clearRect(0, 0, size, size);
  
  // Draw disk ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a3a5e';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Draw inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a2a4e';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw slots
  const nSlots = DISK_SLOTS;
  for (let i = 0; i < nSlots; i++) {
    const angle = (i / nSlots) * Math.PI * 2 - Math.PI / 2;
    const outerX = cx + Math.cos(angle) * radius;
    const outerY = cy + Math.sin(angle) * radius;
    const innerX = cx + Math.cos(angle) * radius * 0.6;
    const innerY = cy + Math.sin(angle) * radius * 0.6;
    
    // Slot line
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.strokeStyle = '#1a2a4e';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Thread dot
    const color = kumiState.state[i];
    if (color) {
      // Draw thread
      ctx.beginPath();
      ctx.arc(outerX, outerY, radius * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  // Highlight active positions (TL, TR, BR, BL)
  const activeSlots = [0, 1, 16, 17];
  activeSlots.forEach(slot => {
    const angle = (slot / nSlots) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.09, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  
  // Labels
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TL', cx + Math.cos(-Math.PI/2) * radius * 0.3, cy + Math.sin(-Math.PI/2) * radius * 0.3 + 4);
  ctx.fillText('TR', cx + Math.cos(-Math.PI/2 + 2*Math.PI/32) * radius * 0.3, cy + Math.sin(-Math.PI/2 + 2*Math.PI/32) * radius * 0.3 + 4);
  ctx.fillText('BR', cx + Math.cos(-Math.PI/2 + 16*Math.PI/32) * radius * 0.3, cy + Math.sin(-Math.PI/2 + 16*Math.PI/32) * radius * 0.3 + 4);
  ctx.fillText('BL', cx + Math.cos(-Math.PI/2 + 17*Math.PI/32) * radius * 0.3, cy + Math.sin(-Math.PI/2 + 17*Math.PI/32) * radius * 0.3 + 4);
  
  // Center info
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Step ${currentStep} / ${totalSteps}`, cx, cy + 4);
  ctx.font = '11px sans-serif';
  ctx.fillText(`${kumiState.nThreads} threads`, cx, cy + 20);
}

function renderChart() {
  if (!kumiState) return;
  const canvas = chartCanvas;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(rect.width - 32, 300);
  const h = Math.max(rect.height - 32, 200);
  
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, w, h);
  
  const chart = getPatternChart(kumiState);
  if (chart.length === 0) {
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('아직 짜여진 행이 없습니다', w / 2, h / 2);
    return;
  }
  
  const rows = chart.length;
  const cols = chart[0].length;
  const cellSize = Math.min(w / cols, h / rows, 24);
  const offsetX = (w - cols * cellSize) / 2;
  const offsetY = (h - rows * cellSize) / 2;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = chart[r][c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
      }
    }
  }
  
  // Highlight current row
  if (currentStep > 0 && currentStep <= rows) {
    const highlightY = offsetY + (currentStep - 1) * cellSize;
    ctx.fillStyle = 'rgba(233, 69, 96, 0.15)';
    ctx.fillRect(offsetX, highlightY, cols * cellSize, cellSize);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, highlightY, cols * cellSize, cellSize);
  }
}

function renderPreview() {
  if (!kumiState) return;
  const canvas = previewCanvas;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(rect.width, 600);
  const h = 120;
  
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, w, h);
  
  const chart = getPatternChart(kumiState);
  if (chart.length === 0) {
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('단계를 진행하여 완성본을 확인하세요', w / 2, h / 2);
    return;
  }
  
  // Draw as a braided cord
  const rows = chart.length;
  const cols = chart[0].length;
  const segmentHeight = h / Math.max(rows, 1);
  const cordWidth = Math.min(w * 0.6, cols * 10);
  const offsetX = (w - cordWidth) / 2;
  
  // Draw each row as a horizontal segment of the cord
  for (let r = 0; r < rows; r++) {
    const y = r * segmentHeight;
    const segColors = chart[r];
    const segW = cordWidth / cols;
    
    for (let c = 0; c < cols; c++) {
      const color = segColors[c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + c * segW, y, segW + 0.5, segmentHeight + 0.5);
      }
    }
  }
  
  // Rounded end effect (draw curves at bottom)
  const gradient = ctx.createLinearGradient(0, h - 10, 0, h);
  gradient.addColorStop(0, 'rgba(26, 26, 46, 0)');
  gradient.addColorStop(1, 'rgba(26, 26, 46, 1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, h - 10, w, 10);
}

function updateStepIndicator() {
  stepIndicator.textContent = `${currentStep} / ${totalSteps}`;
  const pct = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  progressFill.style.width = `${pct}%`;
}

function updateControls() {
  btnFirst.disabled = currentStep <= 0;
  btnPrev.disabled = currentStep <= 0;
  btnNext.disabled = currentStep >= totalSteps;
  btnLast.disabled = currentStep >= totalSteps;
}

// ─── View Tabs ────────────────────────────────────────────
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    viewMode = tab.dataset.view;
    
    if (viewMode === 'disk') {
      diskCanvas.style.display = 'block';
      chartCanvas.style.display = 'none';
    } else {
      diskCanvas.style.display = 'none';
      chartCanvas.style.display = 'block';
    }
    renderAll();
  });
});

// ─── Export ────────────────────────────────────────────────
btnExportPng.addEventListener('click', () => {
  const canvas = viewMode === 'disk' ? diskCanvas : 
                 (viewMode === 'chart' ? chartCanvas : previewCanvas);
  
  const link = document.createElement('a');
  link.download = `palzzi-${currentTemplate?.id || 'kumihimo'}-step${currentStep}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

btnExportSvg.addEventListener('click', () => {
  // Generate simple SVG from the pattern chart
  const chart = getPatternChart(kumiState);
  if (chart.length === 0) return;
  
  const cellSize = 10;
  const cols = chart[0].length;
  const rows = chart.length;
  const svgW = cols * cellSize + 20;
  const svgH = rows * cellSize + 20;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">`;
  svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>`;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = chart[r][c];
      if (color) {
        svg += `<rect x="${10 + c * cellSize}" y="${10 + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>`;
      }
    }
  }
  svg += '</svg>';
  
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.download = `palzzi-${currentTemplate?.id || 'kumihimo'}.svg`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

btnExportJson.addEventListener('click', () => {
  const data = {
    projectName: currentTemplate?.name || 'My Kumihimo',
    craftType: 'KUMIHIMO_ROUND',
    nThreads: kumiState?.nThreads || 8,
    colors: getCurrentColors(),
    pattern: getPatternChart(kumiState),
    stepCount: currentStep
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `palzzi-${currentTemplate?.id || 'pattern'}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

// ─── Local Storage ────────────────────────────────────────
btnSaveLocal.addEventListener('click', () => {
  if (!kumiState) return;
  const data = {
    templateId: currentTemplate?.id,
    colors: getCurrentColors(),
    nThreads: kumiState.nThreads,
    stepCount: currentStep,
    totalSteps,
    history: history.map(snap => snap)
  };
  localStorage.setItem('palzzi-save', JSON.stringify(data));
  alert('저장되었습니다!');
});

btnLoadLocal.addEventListener('click', () => {
  const raw = localStorage.getItem('palzzi-save');
  if (!raw) {
    alert('저장된 데이터가 없습니다.');
    return;
  }
  
  try {
    const data = JSON.parse(raw);
    kumiState = initDisk(data.colors);
    currentStep = data.stepCount;
    totalSteps = data.totalSteps || 120;
    history = data.history || [snapshot(kumiState)];
    
    // Restore to current step
    if (currentStep < history.length) {
      restore(kumiState, history[currentStep]);
    }
    
    if (data.templateId) {
      applyTemplate(data.templateId);
      // Restore step after template application
      if (currentStep < history.length) {
        restore(kumiState, history[currentStep]);
      }
    }
    
    updateColorEditor();
    renderAll();
    updateControls();
    alert('불러오기 완료!');
  } catch (e) {
    alert('데이터를 불러올 수 없습니다.');
    console.error(e);
  }
});

btnShareUrl.addEventListener('click', () => {
  if (!kumiState) return;
  const data = {
    t: currentTemplate?.id,
    c: getCurrentColors(),
    n: kumiState.nThreads,
    s: currentStep
  };
  const encoded = btoa(JSON.stringify(data));
  const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    alert('공유 URL이 클립보드에 복사되었습니다!');
  }).catch(() => {
    // Fallback
    prompt('공유 URL을 복사하세요:', url);
  });
});

// ─── Event Listeners ──────────────────────────────────────
btnApplyTemplate.addEventListener('click', () => {
  applyTemplate(templateSelect.value);
});

threadCountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    changeThreadCount(parseInt(btn.dataset.count));
  });
});

btnFirst.addEventListener('click', goToFirst);
btnPrev.addEventListener('click', goToPrev);
btnPlay.addEventListener('click', togglePlay);
btnNext.addEventListener('click', goToNext);
btnLast.addEventListener('click', goToLast);

speedSelect.addEventListener('change', () => {
  if (isPlaying) {
    stopPlay();
    startPlay();
  }
});

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const targetStep = Math.floor(pct * totalSteps);
  
  if (targetStep < history.length) {
    goToStep(targetStep);
  } else {
    // Weave up to target
    while (currentStep < targetStep && currentStep < totalSteps) {
      doWeave(1);
    }
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  
  switch (e.key) {
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight': goToNext(); break;
    case 'ArrowLeft': goToPrev(); break;
    case 'Home': goToFirst(); break;
    case 'End': goToLast(); break;
  }
});

// Handle share URL on load
function handleShareParam() {
  const params = new URLSearchParams(window.location.search);
  const shareData = params.get('share');
  if (shareData) {
    try {
      const data = JSON.parse(atob(shareData));
      if (data.t) {
        applyTemplate(data.t);
      }
      if (data.c && data.n) {
        kumiState = initDisk(data.c);
      }
      if (data.s > 0) {
        doWeave(data.s);
      }
    } catch (e) {
      console.error('Failed to load shared data:', e);
    }
  }
}

// ─── Resize Handling ──────────────────────────────────────
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => renderAll(), 200);
});

// ─── Init ─────────────────────────────────────────────────
populateTemplates();
applyTemplate(TEMPLATES[0].id);
handleShareParam();

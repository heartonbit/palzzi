/**
 * Palzzi Kumihimo Pattern Gallery
 * Fetches saved patterns from Firestore, displays them in a grid,
 * and provides a detail panel when a pattern card is clicked.
 */
import { db } from './firebase/config.js';
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { signInWithGoogle, signOutUser, onAuthChange } from './firebase/auth.js';
import { KumihimoDisk } from './engine/kumihimo.js';

// --- i18n Translations (subset for gallery page) ---
const GALLERY_TRANSLATIONS = {
  ko: {
    galleryTitle: "Palzzi - 쿠미히모 패턴 갤러리",
    logoTitle: "Palzzi",
    galleryBadge: "갤러리",
    backToSimulator: "시뮬레이터로",
    galleryHeading: "쿠미히모 패턴 갤러리",
    gallerySubtitle: "Firebase에 저장된 쿠미히모 패턴을 감상하고 클릭하여 상세 정보를 확인하세요.",
    loadingPatterns: "패턴을 불러오는 중...",
    noPatterns: "아직 저장된 패턴이 없습니다.",
    createFirst: "첫 패턴 만들기",
    detailTitle: "패턴 상세 정보",
    metaPatternName: "패턴 이름",
    metaThreads: "가닥 수",
    metaSteps: "직조 단계",
    metaCreatedAt: "생성일",
    colorSwatches: "사용 색상",
    loadToSimulator: "시뮬레이터에서 열기",
    deletePattern: "패턴 삭제",
    confirmDelete: "이 패턴을 삭제하시겠습니까?",
    deleteSuccess: "패턴이 삭제되었습니다.",
    deleteFailed: "삭제에 실패했습니다.",
    threadsUnit: "가닥",
    stepsUnit: "단계",
    unknownPattern: "알 수 없는 패턴",
    unknownDate: "날짜 없음",
    signInWithGoogle: "Google 로그인",
    signOut: "로그아웃",
    signInRequired: "패턴을 저장하려면 로그인하세요.",
    signInToSave: "로그인 후 저장 가능",
  },
  en: {
    galleryTitle: "Palzzi - Kumihimo Pattern Gallery",
    logoTitle: "Palzzi",
    galleryBadge: "Gallery",
    backToSimulator: "To Simulator",
    galleryHeading: "Kumihimo Pattern Gallery",
    gallerySubtitle: "Browse Kumihimo patterns saved to Firebase. Click a card to see details.",
    loadingPatterns: "Loading patterns...",
    noPatterns: "No patterns saved yet.",
    createFirst: "Create First Pattern",
    detailTitle: "Pattern Details",
    metaPatternName: "Pattern Name",
    metaThreads: "Threads",
    metaSteps: "Weave Steps",
    metaCreatedAt: "Created At",
    colorSwatches: "Colors Used",
    loadToSimulator: "Open in Simulator",
    deletePattern: "Delete Pattern",
    confirmDelete: "Are you sure you want to delete this pattern?",
    deleteSuccess: "Pattern deleted successfully.",
    deleteFailed: "Failed to delete pattern.",
    threadsUnit: "strands",
    stepsUnit: "steps",
    unknownPattern: "Unknown Pattern",
    unknownDate: "No date",
    signInWithGoogle: "Sign in with Google",
    signOut: "Sign out",
    signInRequired: "Please sign in to save patterns.",
    signInToSave: "Sign in to save",
  }
};

let currentLang = 'en';
let patterns = [];
let selectedPattern = null;
let currentUser = null;

// --- DOM Elements ---
const authArea = document.getElementById('auth-area');
const btnLangKo = document.getElementById('btn-lang-ko');
const btnLangEn = document.getElementById('btn-lang-en');
const galleryLoading = document.getElementById('gallery-loading');
const galleryEmpty = document.getElementById('gallery-empty');
const galleryGrid = document.getElementById('gallery-grid');
const detailPanel = document.getElementById('detail-panel');
const btnCloseDetail = document.getElementById('btn-close-detail');
const detailCanvas = document.getElementById('detail-canvas');
const detailName = document.getElementById('detail-name');
const detailThreads = document.getElementById('detail-threads');
const detailSteps = document.getElementById('detail-steps');
const detailCreated = document.getElementById('detail-created');
const detailColorList = document.getElementById('detail-color-list');
const btnLoadSimulator = document.getElementById('btn-load-simulator');
const btnDeletePattern = document.getElementById('btn-delete-pattern');

const ctxDetail = detailCanvas.getContext('2d');

// --- Auth UI ---
const GOOGLE_ICON_SVG = `<svg class="google-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.81-4.59l-7.98-6.19A23.93 23.93 0 0 0 0 24c0 3.77.9 7.35 2.56 10.59l7.97-6zm"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function updateAuthUI(user) {
  currentUser = user;
  const t = GALLERY_TRANSLATIONS[currentLang];

  if (user) {
    authArea.innerHTML = `
      <div class="auth-user-info">
        <img src="${user.photoURL || '/public/default-avatar.png'}" alt="avatar" class="auth-avatar" referrerpolicy="no-referrer">
        <span class="auth-display-name">${user.displayName || user.email}</span>
      </div>
      <button class="btn-signout" id="btn-signout">${t.signOut}</button>
    `;
    document.getElementById('btn-signout').addEventListener('click', () => {
      signOutUser();
    });
  } else {
    authArea.innerHTML = `
      <button class="btn-google-signin" id="btn-google-signin">
        ${GOOGLE_ICON_SVG} ${t.signInWithGoogle}
      </button>
    `;
    document.getElementById('btn-google-signin').addEventListener('click', () => {
      signInWithGoogle();
    });
  }
}

// --- Initialization ---
function init() {
  setLanguage('en');

  // Auth state listener — update UI and re-render on auth change
  onAuthChange((user) => {
    updateAuthUI(user);
    fetchPatterns();
  });

  setupEventListeners();
}

function setLanguage(lang) {
  currentLang = lang;
  if (lang === 'ko') {
    btnLangKo.classList.add('active');
    btnLangEn.classList.remove('active');
  } else {
    btnLangEn.classList.add('active');
    btnLangKo.classList.remove('active');
  }

  // Translate all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const t = GALLERY_TRANSLATIONS[lang];
    if (t && t[key]) {
      // Handle buttons that may contain <i> icons
      const icon = el.querySelector('i');
      if (icon) {
        el.innerHTML = `${icon.outerHTML} ${t[key]}`;
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Re-render if patterns are already loaded
  if (patterns.length > 0) {
    renderGallery();
  }
  if (selectedPattern) {
    showDetail(selectedPattern);
  }
}

// --- Firestore: Fetch all patterns ---
async function fetchPatterns() {
  showState('loading');

  try {
    const q = query(collection(db, 'patterns'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    patterns = [];
    snapshot.forEach(docSnap => {
      patterns.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (patterns.length === 0) {
      showState('empty');
    } else {
      showState('grid');
      renderGallery();
    }
  } catch (err) {
    console.error('Error fetching patterns:', err);
    // For development: if Firestore is not configured, show empty state with a hint
    if (err.code === 'failed-precondition' || err.message.includes('projectId')) {
      showState('empty');
    } else {
      showState('empty');
    }
  }
}

function showState(state) {
  galleryLoading.classList.add('hidden');
  galleryEmpty.classList.add('hidden');
  galleryGrid.classList.add('hidden');

  if (state === 'loading') {
    galleryLoading.classList.remove('hidden');
  } else if (state === 'empty') {
    galleryEmpty.classList.remove('hidden');
  } else if (state === 'grid') {
    galleryGrid.classList.remove('hidden');
  }
}

// --- Render Gallery Grid ---
function renderGallery() {
  galleryGrid.innerHTML = '';

  patterns.forEach(pattern => {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    card.dataset.id = pattern.id;

    const t = GALLERY_TRANSLATIONS[currentLang];
    const patternName = currentLang === 'ko'
      ? (pattern.nameKo || pattern.templateName || t.unknownPattern)
      : (pattern.nameEn || pattern.templateName || t.unknownPattern);

    const threadsLabel = pattern.nThreads ? `${pattern.nThreads}${t.threadsUnit}` : '-';
    const stepsLabel = pattern.maxSteps ? `${pattern.maxSteps}${t.stepsUnit}` : '-';

    card.innerHTML = `
      <div class="card-preview">
        <canvas width="320" height="200"></canvas>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-tag"><i class="fa-solid fa-braille"></i> ${threadsLabel}</span>
          <span class="card-tag"><i class="fa-solid fa-layer-group"></i> ${stepsLabel}</span>
        </div>
        <div class="card-colors">
          ${(pattern.colors || []).slice(0, 8).map(c => `<div class="card-color-dot" style="background-color:${c}"></div>`).join('')}
          ${(pattern.colors || []).length > 8 ? `<span class="card-tag">+${(pattern.colors || []).length - 8}</span>` : ''}
        </div>
      </div>
    `;

    // Render braid preview on card canvas
    const canvas = card.querySelector('canvas');
    drawBraidPreview(canvas, pattern.colors || [], pattern.nThreads || 8, pattern.maxSteps || 120);

    card.addEventListener('click', () => {
      selectedPattern = pattern;
      showDetail(pattern);
    });

    galleryGrid.appendChild(card);
  });
}

// --- Draw braid preview on a small canvas using the real KumihimoDisk engine ---
function drawBraidPreview(canvas, colors, nThreads, maxSteps) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);

  if (colors.length === 0 || nThreads === 0) return;

  // Ensure colors array matches nThreads
  const threadColors = [...colors];
  while (threadColors.length < nThreads) {
    threadColors.push('#ccc');
  }

  // Simulate using the real KumihimoDisk engine
  const disk = new KumihimoDisk(nThreads);
  disk.init(threadColors);

  const simSteps = Math.min(maxSteps, 80);
  for (let s = 0; s < simSteps; s++) {
    disk.weaveRow();
  }

  if (disk.productColors.length <= 1) return;

  // --- Render the braid (mirrors main.js exactly, manually scaled for thumbnail) ---
  // Same layout as main.js: translate to cx, hanger at top, braid flows down
  // No ctx.scale — strandWidth set in native pixels to avoid sub-pixel gaps

  const sRadius = 18;
  const sPitch = 1.8;
  const sStartY = 16;   // scaled equivalent of main.js y=32 (32 * 0.55 ≈ 17.6)
  const sHangerY = 15;   // scaled equivalent of main.js y=30
  const sHangerR = 7;    // scaled equivalent of main.js hanger radius 14
  const sKnotW = 2.5;    // scaled equivalent of main.js lineWidth 5

  ctx.save();
  ctx.translate(cx, 0);

  // Draw hanger — same structure as main.js
  ctx.beginPath();
  ctx.arc(0, sHangerY, sHangerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#8a7e72';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-sKnotW, 0);
  ctx.lineTo(-sKnotW, sHangerY);
  ctx.moveTo(sKnotW, 0);
  ctx.lineTo(sKnotW, sHangerY);
  ctx.strokeStyle = '#a69c91';
  ctx.lineWidth = sKnotW;
  ctx.stroke();

  // Same maxVisibleRows calculation as main.js: (height - 80) / pitch
  // Adjusted for thumbnail scale: (height - 40) / sPitch
  const maxVisibleRows = Math.floor((height - 40) / sPitch);
  const endRowIdx = Math.min(disk.productColors.length, maxVisibleRows);

  // Strand width: match main.js visual ratio, slightly thicker to eliminate row gaps
  const strandWidth = Math.max(5, Math.min(12, sRadius * 0.6));

  const segments = [];
  for (let r = 1; r < endRowIdx; r++) {
    const prevRow = disk.productColors[r - 1];
    const currRow = disk.productColors[r];
    const prevY = sStartY + (r - 1) * sPitch;
    const currY = sStartY + r * sPitch;

    for (let i = 0; i < disk.nThreads; i++) {
      const prevThread = prevRow[i];
      const currThread = currRow[i];
      if (!prevThread || !currThread) continue;

      const prevTheta = (prevThread.slot * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;
      const currTheta = (currThread.slot * 2 * Math.PI) / disk.slotsCount - Math.PI / 2;

      let diff = currTheta - prevTheta;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      const adjustedCurrTheta = prevTheta + diff;

      const prevX = sRadius * Math.sin(prevTheta);
      const prevZ = sRadius * Math.cos(prevTheta);
      const currX = sRadius * Math.sin(adjustedCurrTheta);
      const currZ = sRadius * Math.cos(adjustedCurrTheta);

      if (prevZ > -12 || currZ > -12) {
        const avgZ = (prevZ + currZ) / 2;
        segments.push({
          color: currThread.color,
          fx: prevX,
          fy: prevY,
          tx: currX,
          ty: currY,
          avgZ,
          prevZ,
          currZ
        });
      }
    }
  }

  // Global depth sort (same as main.js): back threads first, front threads last
  segments.sort((a, b) => a.avgZ - b.avgZ);

  segments.forEach(seg => {
    ctx.beginPath();
    ctx.moveTo(seg.fx, seg.fy);
    ctx.lineTo(seg.tx, seg.ty);

    const lightingFactor = 0.52 + 0.48 * ((seg.avgZ + sRadius) / (2 * sRadius));
    const shadedColor = adjustColorBrightness(seg.color, lightingFactor);

    ctx.lineWidth = strandWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = shadedColor;
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 2.5;
    ctx.shadowOffsetY = 1;
    ctx.stroke();
  });

  ctx.restore();
}

// Color brightness adjustment (mirrors main.js adjustColorBrightness)
function adjustColorBrightness(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r * factor));
  const ng = Math.min(255, Math.round(g * factor));
  const nb = Math.min(255, Math.round(b * factor));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// --- Detail Panel ---
function showDetail(pattern) {
  const t = GALLERY_TRANSLATIONS[currentLang];

  // Update gallery grid selection
  document.querySelectorAll('.pattern-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === pattern.id);
  });

  // Show panel
  detailPanel.classList.remove('hidden');
  document.querySelector('.gallery-area').classList.add('with-detail');

  // Fill metadata
  const patternName = currentLang === 'ko'
    ? (pattern.nameKo || pattern.templateName || t.unknownPattern)
    : (pattern.nameEn || pattern.templateName || t.unknownPattern);
  detailName.textContent = patternName;
  detailThreads.textContent = pattern.nThreads ? `${pattern.nThreads}${t.threadsUnit}` : '-';
  detailSteps.textContent = pattern.maxSteps ? `${pattern.maxSteps}${t.stepsUnit}` : '-';

  if (pattern.createdAt && pattern.createdAt.toDate) {
    detailCreated.textContent = pattern.createdAt.toDate().toLocaleDateString();
  } else if (pattern.createdAt) {
    detailCreated.textContent = new Date(pattern.createdAt).toLocaleDateString();
  } else {
    detailCreated.textContent = t.unknownDate;
  }

  // Draw detail braid preview
  drawBraidPreview(detailCanvas, pattern.colors || [], pattern.nThreads || 8, pattern.maxSteps || 120);

  // Render color swatches
  detailColorList.innerHTML = '';
  const uniqueColors = [...new Set(pattern.colors || [])];
  uniqueColors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.innerHTML = `
      <div class="swatch-dot" style="background-color:${color}"></div>
      <span>${color}</span>
    `;
    detailColorList.appendChild(swatch);
  });
}

function hideDetail() {
  detailPanel.classList.add('hidden');
  document.querySelector('.gallery-area').classList.remove('with-detail');
  document.querySelectorAll('.pattern-card').forEach(card => {
    card.classList.remove('selected');
  });
  selectedPattern = null;
}

// --- Event Listeners ---
function setupEventListeners() {
  // Language toggle
  btnLangKo.addEventListener('click', () => setLanguage('ko'));
  btnLangEn.addEventListener('click', () => setLanguage('en'));

  // Close detail panel
  btnCloseDetail.addEventListener('click', hideDetail);

  // Load pattern to simulator
  btnLoadSimulator.addEventListener('click', () => {
    if (!selectedPattern) return;

    // Build URL with pattern data — navigate to simulator page
    const hexArray = selectedPattern.colors.map(c => c.replace('#', ''));
    const url = new URL('/simulator', window.location.origin);
    url.searchParams.set('tmpl', selectedPattern.templateId || 'kumihimo-8-candy');
    url.searchParams.set('colors', hexArray.join(','));
    url.searchParams.set('step', selectedPattern.maxSteps || '120');

    window.location.href = url.toString();
  });

  // Delete pattern
  btnDeletePattern.addEventListener('click', async () => {
    if (!selectedPattern) return;
    if (!currentUser) {
      const t = GALLERY_TRANSLATIONS[currentLang];
      showToast(t.signInRequired);
      return;
    }

    const t = GALLERY_TRANSLATIONS[currentLang];
    if (!confirm(t.confirmDelete)) return;

    try {
      await deleteDoc(doc(db, 'patterns', selectedPattern.id));
      showToast(t.deleteSuccess);

      // Remove from local list and re-render
      patterns = patterns.filter(p => p.id !== selectedPattern.id);
      hideDetail();
      renderGallery();

      if (patterns.length === 0) {
        showState('empty');
      }
    } catch (err) {
      console.error('Error deleting pattern:', err);
      showToast(t.deleteFailed);
    }
  });
}

function showToast(msg) {
  // Simple toast — reuse main app pattern
  let toast = document.getElementById('gallery-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gallery-toast';
    toast.className = 'toast hidden';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #333; color: white; padding: 10px 18px; border-radius: 8px;
      font-size: 13px; z-index: 9999; transition: opacity 0.3s, transform 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Run on load
window.addEventListener('DOMContentLoaded', init);

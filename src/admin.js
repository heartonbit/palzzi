import { db } from './firebase/config.js';
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { signInWithGoogle, signOutUser, onAuthChange } from './firebase/auth.js';

let currentUser = null;
let userIsAdmin = false;
let adminUids = new Set();
let patternOwners = [];

const authArea = document.getElementById('auth-area');
const adminContent = document.getElementById('admin-content');
const adminLoading = document.getElementById('admin-loading');

const GOOGLE_ICON_SVG = `<svg class="google-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.81-4.59l-7.98-6.19A23.93 23.93 0 0 0 0 24c0 3.77.9 7.35 2.56 10.59l7.97-6zm"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function updateAuthUI(user) {
  currentUser = user;
  if (user) {
    authArea.innerHTML = `
      <div class="auth-user-info">
        <img src="${user.photoURL || '/public/default-avatar.png'}" alt="avatar" class="auth-avatar" referrerpolicy="no-referrer">
        <span class="auth-display-name">${user.displayName || user.email}</span>
      </div>
      <button class="btn-signout" id="btn-signout">로그아웃</button>
    `;
    document.getElementById('btn-signout').addEventListener('click', () => signOutUser());
  } else {
    authArea.innerHTML = `
      <button class="btn-google-signin" id="btn-google-signin">
        ${GOOGLE_ICON_SVG} Google 로그인
      </button>
    `;
    document.getElementById('btn-google-signin').addEventListener('click', () => signInWithGoogle());
  }
}

async function loadData() {
  const [adminsSnap, patternsSnap] = await Promise.all([
    getDocs(collection(db, 'admins')),
    getDocs(collection(db, 'patterns'))
  ]);

  adminUids = new Set(adminsSnap.docs.map(d => d.id));

  // Extract unique owners from patterns
  const ownerMap = new Map();
  patternsSnap.docs.forEach(d => {
    const data = d.data();
    const uid = data.ownerUid;
    if (!uid) return;
    if (!ownerMap.has(uid)) {
      ownerMap.set(uid, {
        uid,
        name: data.ownerName || '(이름 없음)',
        photoURL: data.ownerPhoto || '',
        patternCount: 0
      });
    }
    ownerMap.get(uid).patternCount++;
  });

  patternOwners = [...ownerMap.values()].sort((a, b) => b.patternCount - a.patternCount);
}

async function checkAdminAndRender(user) {
  if (!user) {
    renderSignInPrompt();
    return;
  }

  try {
    const adminSnap = await getDocs(collection(db, 'admins'));
    adminUids = new Set(adminSnap.docs.map(d => d.id));
    userIsAdmin = adminUids.has(user.uid);

    if (!userIsAdmin) {
      renderAccessDenied();
      return;
    }

    await loadData();
    renderAdminPanel();
  } catch (err) {
    console.error('Error checking admin status:', err);
    renderAccessDenied();
  }
}

function renderSignInPrompt() {
  adminLoading.classList.add('hidden');
  adminContent.innerHTML = `
    <div class="access-denied">
      <i class="fa-solid fa-lock"></i>
      <h2>로그인이 필요합니다</h2>
      <p>관리자 페이지에 접근하려면 먼저 로그인하세요.</p>
    </div>
  `;
}

function renderAccessDenied() {
  adminLoading.classList.add('hidden');
  adminContent.innerHTML = `
    <div class="access-denied">
      <i class="fa-solid fa-shield-halved"></i>
      <h2>접근 권한 없음</h2>
      <p>이 페이지는 관리자만 접근할 수 있습니다.</p>
    </div>
  `;
}

function renderOwnerRow(owner) {
  const isAdminUser = adminUids.has(owner.uid);
  const isSelf = owner.uid === currentUser.uid;

  return `
    <li class="user-row" data-uid="${owner.uid}">
      <div class="user-info">
        ${owner.photoURL
          ? `<img src="${owner.photoURL}" alt="" class="user-avatar" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
          : `<div class="user-avatar user-avatar-placeholder">${owner.name.charAt(0).toUpperCase()}</div>`
        }
        <div class="user-details">
          <span class="user-name">${owner.name}${isSelf ? '<span class="admin-you-badge">나</span>' : ''}</span>
          <span class="user-email">패턴 ${owner.patternCount}개</span>
        </div>
      </div>
      <div class="user-actions">
        ${isAdminUser
          ? `<button class="btn-role btn-role-admin" data-uid="${owner.uid}" ${isSelf ? 'disabled title="자기 자신은 제거할 수 없습니다"' : ''}>
              <i class="fa-solid fa-shield"></i> 관리자
             </button>`
          : `<button class="btn-role btn-role-user" data-uid="${owner.uid}">
              <i class="fa-solid fa-user"></i> 사용자
             </button>`
        }
      </div>
    </li>
  `;
}

function renderAdminPanel() {
  adminLoading.classList.add('hidden');

  const adminOwners = patternOwners.filter(o => adminUids.has(o.uid));
  const nonAdminOwners = patternOwners.filter(o => !adminUids.has(o.uid));

  adminContent.innerHTML = `
    <div class="admin-card">
      <h2><i class="fa-solid fa-shield-halved"></i> 관리자 목록</h2>
      ${adminOwners.length === 0
        ? '<p class="section-empty"><i class="fa-solid fa-user-slash"></i> 등록된 관리자가 없습니다.</p>'
        : `<ul class="user-list">${adminOwners.map(renderOwnerRow).join('')}</ul>`
      }
    </div>

    <div class="admin-card">
      <h2><i class="fa-solid fa-images"></i> 패턴 저장자</h2>
      <p class="section-desc">패턴을 저장한 사용자 ${patternOwners.length}명</p>
      ${nonAdminOwners.length === 0
        ? '<p class="section-empty"><i class="fa-solid fa-check-circle"></i> 모든 패턴 저장자가 이미 관리자입니다.</p>'
        : `<ul class="user-list">${nonAdminOwners.map(renderOwnerRow).join('')}</ul>`
      }
    </div>
  `;

  adminContent.querySelectorAll('.btn-role-user').forEach(btn => {
    btn.addEventListener('click', () => toggleAdmin(btn.dataset.uid, true));
  });
  adminContent.querySelectorAll('.btn-role-admin').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => toggleAdmin(btn.dataset.uid, false));
    }
  });
}

async function toggleAdmin(uid, add) {
  const action = add ? '관리자로 등록' : '관리자 제거';
  if (!confirm(`${action}하시겠습니까?`)) return;

  try {
    if (add) {
      await setDoc(doc(db, 'admins', uid), { addedAt: new Date() });
      adminUids.add(uid);
    } else {
      await deleteDoc(doc(db, 'admins', uid));
      adminUids.delete(uid);
    }
    showToast(add ? '관리자로 등록되었습니다.' : '관리자가 해제되었습니다.');
    renderAdminPanel();
  } catch (err) {
    console.error(`Error ${add ? 'adding' : 'removing'} admin:`, err);
    showToast(`${action}에 실패했습니다.`);
  }
}

function showToast(msg) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'admin-toast hidden';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function init() {
  onAuthChange((user) => {
    updateAuthUI(user);
    adminLoading.classList.remove('hidden');
    adminContent.innerHTML = '';
    adminContent.appendChild(adminLoading);
    checkAdminAndRender(user);
  });
}

window.addEventListener('DOMContentLoaded', init);

import { TRANSLATIONS } from './i18n.js';

const savedLang = localStorage.getItem('palzzi-lang');
const browserLang = navigator.language?.slice(0, 2);
let currentLang = savedLang || browserLang || 'ko';
if (!TRANSLATIONS[currentLang]) currentLang = 'ko';

document.documentElement.lang = currentLang;

function applyI18n() {
  const t = TRANSLATIONS[currentLang];
  if (!t) return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (t[key]) document.title = t[key];
  });
}

function initLangToggle() {
  const btn = document.getElementById('btn-lang-toggle');
  const popup = document.getElementById('lang-popup');
  if (!btn || !popup) return;

  popup.classList.toggle('hidden', currentLang !== 'ko');

  btn.addEventListener('click', () => popup.classList.toggle('hidden'));

  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      currentLang = opt.id === 'btn-lang-ko' ? 'ko' : 'en';
      localStorage.setItem('palzzi-lang', currentLang);
      document.documentElement.lang = currentLang;
      applyI18n();
      document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      popup.classList.add('hidden');
    });
  });

  document.querySelectorAll('.lang-option').forEach(o => {
    o.classList.toggle('active',
      (o.id === 'btn-lang-ko' && currentLang === 'ko') ||
      (o.id === 'btn-lang-en' && currentLang === 'en')
    );
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  initLangToggle();
});

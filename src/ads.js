/**
 * AdSense module — reads IDs from Vite env vars and injects ads dynamically.
 * This keeps ad credentials in .env instead of hardcoded in HTML.
 */

const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;
const ADSENSE_SLOT_SIDEBAR = import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR;
const ADSENSE_SLOT_PLAYBACK = import.meta.env.VITE_ADSENSE_SLOT_PLAYBACK;
const ADSENSE_SLOT_GALLERY_BANNER = import.meta.env.VITE_ADSENSE_SLOT_GALLERY_BANNER;

function isConfigured() {
  return ADSENSE_CLIENT_ID && !ADSENSE_CLIENT_ID.includes('XXXX');
}

/** Inject the AdSense script tag into <head>. Call once per page. */
export function initAdSense() {
  if (!isConfigured()) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

/** Create an <ins class="adsbygoogle"> element and push it to the AdSense queue. */
function createIns(slotId, format, extraClass = '') {
  const ins = document.createElement('ins');
  ins.className = `adsbygoogle ${extraClass}`;
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', ADSENSE_CLIENT_ID);
  ins.setAttribute('data-ad-slot', slotId);
  ins.setAttribute('data-ad-format', format);
  ins.setAttribute('data-full-width-responsive', 'true');
  return ins;
}

function pushAd() {
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}

/** Inject sidebar ad into the given container element. */
export function injectSidebarAd(container) {
  if (!isConfigured() || !ADSENSE_SLOT_SIDEBAR) return;
  const section = document.createElement('section');
  section.className = 'panel-section ad-section';
  const ins = createIns(ADSENSE_SLOT_SIDEBAR, 'vertical', 'ad-sidebar');
  section.appendChild(ins);
  container.appendChild(section);
  pushAd();
}

/** Inject playback ad below the given element. */
export function injectPlaybackAd(container) {
  if (!isConfigured() || !ADSENSE_SLOT_PLAYBACK) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'ad-playback-wrapper';
  const ins = createIns(ADSENSE_SLOT_PLAYBACK, 'auto', 'ad-playback');
  wrapper.appendChild(ins);
  container.appendChild(wrapper);
  pushAd();
}

/** Inject gallery banner ad into the given container. */
export function injectGalleryBannerAd(container) {
  if (!isConfigured() || !ADSENSE_SLOT_GALLERY_BANNER) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'ad-gallery-banner-wrapper';
  const ins = createIns(ADSENSE_SLOT_GALLERY_BANNER, 'auto', 'ad-gallery-banner');
  wrapper.appendChild(ins);
  container.appendChild(wrapper);
  pushAd();
}

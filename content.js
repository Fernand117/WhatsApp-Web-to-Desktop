(() => {
  'use strict';

  const WIDTH_KEY = 'wa_resizer_width_v2';
  const MIN_WIDTH = 240;
  const MAX_WIDTH_RATIO = 0.6;
  const BREAKPOINT = 700;
  const DEFAULT_WIDTH = 380;

  let panel = null;
  let handle = null;
  let scrim = null;
  let toggle = null;
  let width = DEFAULT_WIDTH;
  let overlayOpen = false;
  let attached = false;
  let resizeTimer = null;
  let teardownTimer = null;

  function storeGet() {
    return new Promise((resolve) => {
      const done = (v) => resolve(v && Number.isFinite(v) && v > 0 ? v : null);
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(WIDTH_KEY, (data) => done(data && data[WIDTH_KEY]));
        } else {
          done(parseFloat(localStorage.getItem(WIDTH_KEY)));
        }
      } catch (e) {
        done(null);
      }
    });
  }

  function storeSet(value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [WIDTH_KEY]: value });
      } else {
        localStorage.setItem(WIDTH_KEY, String(value));
      }
    } catch (e) {}
  }

  function rectOf(el) {
    try {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    } catch (e) {
      return null;
    }
  }

  function maxAllowed() {
    return Math.max(MIN_WIDTH, Math.floor(window.innerWidth * MAX_WIDTH_RATIO));
  }

  function clampWidth(v) {
    return Math.round(Math.min(maxAllowed(), Math.max(MIN_WIDTH, v)));
  }

  function containsSearchArea(el) {
    try {
      if (el.querySelector('div[contenteditable][role="textbox"]')) return true;
      if (el.querySelector('input[type="text"]')) return true;
    } catch (e) {}
    return false;
  }

  function findPanel() {
    const byClass = Array.prototype.slice
      .call(document.querySelectorAll('.x1a0bplq'))
      .filter((el) => {
        const r = rectOf(el);
        return r && r.width >= 100 && r.height >= 200;
      });
    const withSearch = byClass.filter(containsSearchArea);
    if (byClass.length && !withSearch.length) return null;
    const pool = withSearch.slice();
    pool.sort((a, b) => {
      const ra = rectOf(a);
      const rb = rectOf(b);
      return ra.left - rb.left || ra.width - rb.width;
    });
    if (pool.length) return pool[0];

    const boxes = Array.prototype.slice
      .call(document.querySelectorAll('div[contenteditable][role="textbox"], input[type="text"]'))
      .filter((b) => {
        const r = rectOf(b);
        return r && r.height > 0;
      });
    if (!boxes.length) return null;
    boxes.sort((a, b) => rectOf(a).left - rectOf(b).left);
    const search = boxes[0];
    let node = search;
    while (node && node.parentElement) {
      node = node.parentElement;
      const columns = Array.prototype.slice
        .call(node.children)
        .filter((c) => {
          const r = rectOf(c);
          return r && r.width >= 100 && r.height >= 200;
        });
      if (columns.length >= 2) {
        const hits = columns.filter((c) => c.contains(search));
        hits.sort((a, b) => rectOf(a).width - rectOf(b).width);
        if (hits.length) return hits[0];
      }
    }
    return null;
  }

  function applyWidth(value) {
    width = clampWidth(value);
    if (panel) {
      panel.style.setProperty('--wa-sw', width + 'px');
      panel.style.width = width + 'px';
    }
  }

  function setOverlay(open) {
    overlayOpen = open;
    if (panel && panel.hasAttribute('data-wa-overlay')) {
      panel.setAttribute('data-wa-overlay-hidden', String(!open));
    }
    if (scrim) scrim.classList.toggle('wa-shown', open);
  }

  function syncMode() {
    if (!panel) return;
    const narrow = window.innerWidth <= BREAKPOINT;
    if (narrow) {
      const r = rectOf(panel);
      if (r && r.width < 40) return;
      if (!toggle.classList.contains('wa-shown')) toggle.classList.add('wa-shown');
      panel.setAttribute('data-wa-overlay', 'true');
      setOverlay(false);
    } else {
      toggle.classList.remove('wa-shown');
      panel.removeAttribute('data-wa-overlay');
      panel.removeAttribute('data-wa-overlay-hidden');
      panel.style.position = 'relative';
      setOverlay(false);
    }
  }

  function onHandleDown(e) {
    if (e.button !== 0) return;
    if (overlayOpen !== true && window.innerWidth <= BREAKPOINT) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    document.documentElement.classList.add('wa-resizing');
    if (handle) handle.classList.add('wa-handle-dragging');

    const onMove = (ev) => applyWidth(startW + (ev.clientX - startX));
    const onUp = () => {
      document.documentElement.classList.remove('wa-resizing');
      if (handle) handle.classList.remove('wa-handle-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      storeSet(width);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function buildUI() {
    handle = document.createElement('div');
    handle.id = 'wa-sidebar-handle';
    handle.title = 'Arrastrar para ajustar el ancho';
    handle.addEventListener('mousedown', onHandleDown);
    handle.addEventListener('dblclick', () => applyWidth(DEFAULT_WIDTH));
    panel.appendChild(handle);

    scrim = document.createElement('div');
    scrim.id = 'wa-sidebar-scrim';
    scrim.addEventListener('click', () => setOverlay(false));
    document.body.appendChild(scrim);

    toggle = document.createElement('button');
    toggle.id = 'wa-sidebar-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Mostrar lista de chats');
    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>';
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOverlay(!overlayOpen);
    });
    document.body.appendChild(toggle);
  }

  function teardown() {
    if (handle && handle.parentNode) handle.parentNode.removeChild(handle);
    if (scrim && scrim.parentNode) scrim.parentNode.removeChild(scrim);
    if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
    handle = scrim = toggle = null;
    if (panel) {
      panel.removeAttribute('data-wa-sidebar-panel');
      panel.removeAttribute('data-wa-overlay');
      panel.removeAttribute('data-wa-overlay-hidden');
      panel.style.removeProperty('--wa-sw');
      panel.style.width = '';
      panel.style.position = '';
    }
    panel = null;
    attached = false;
  }

  async function setup() {
    if (attached) return;
    const el = findPanel();
    if (!el) return;
    attached = true;
    panel = el;
    panel.setAttribute('data-wa-sidebar-panel', 'true');
    if (getComputedStyle(panel).position === 'static') panel.style.position = 'relative';
    buildUI();
    const saved = await storeGet();
    const current = rectOf(panel);
    applyWidth(saved || (current && current.width > 80 ? current.width : DEFAULT_WIDTH));
    syncMode();
    const candidates = Array.prototype.slice.call(document.querySelectorAll('.x1a0bplq')).map((c, index) => {
      const r = rectOf(c) || {};
      return {
        index,
        left: Math.round(r.left || 0),
        top: Math.round(r.top || 0),
        width: Math.round(r.width || 0),
        height: Math.round(r.height || 0),
        textboxes: c.querySelectorAll('div[contenteditable][role="textbox"], input[type="text"]').length,
        html: c.outerHTML.slice(0, 180)
      };
    });
    console.table(candidates);
    console.log('[WA Resizer] panel elegido:', panel, {
      clase: (panel.className || '').toString(),
      rect: rectOf(panel),
      candidatosX1a0bplq: candidates
    });
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (width > maxAllowed()) applyWidth(maxAllowed());
      syncMode();
    }, 150);
  });

  new MutationObserver(() => {
    if (!attached) return;
    if (!document.body.contains(panel)) {
      clearTimeout(teardownTimer);
      teardownTimer = setTimeout(() => {
        teardown();
        setup();
      }, 300);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    if (!attached) setup();
  }, 1500);
})();

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/* Load persisted UI state (minimal mode + appearance) once, synchronously, so
   the very first paint already matches the last-used mode — no flash. */
let savedSettings = {};
try { savedSettings = ipcRenderer.sendSync('settings:load-sync') || {}; } catch {}
const initialMinimal = process.env.DSH_FLOAT_FULL === '1' ? false : (savedSettings.minimal !== false);

try {
  if (document.documentElement) {
    if (initialMinimal) document.documentElement.setAttribute('data-float-minimal', '');
  }
} catch {}

/* Earliest shell CSS, injected before any page script runs: hide the SPA's
   white "Loading plugins…" boot page and force a transparent document, so the
   float window can never flash white — even a frame rendered before the full
   skin arrives via insertCSS. */
try {
  const style = document.createElement('style');
  style.textContent = 'html[data-float-minimal],html[data-float-minimal] body{background:transparent!important}[data-dsh-boot]{display:none!important}';
  (document.head || document.documentElement).appendChild(style);
} catch {}

let onMinimalChanged = () => {};

/* Injected over the served SPA: a transparent drag strip (the frameless
   window's title bar) + minimal window controls. React owns #root only, so
   appending to <html> is never touched by re-renders. */
function injectControls() {
  const drag = document.createElement('div');
  drag.style.cssText = 'position:fixed;top:0;left:0;right:0;height:34px;z-index:2147483646;-webkit-app-region:drag;';
  document.documentElement.appendChild(drag);

  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:6px;right:10px;z-index:2147483647;-webkit-app-region:no-drag;display:flex;align-items:center;gap:8px;font-family:monospace;';

  // Collapsed to a breathing dot; the button row slides open on hover.
  const menu = document.createElement('div');
  menu.style.cssText = 'display:flex;gap:3px;overflow:hidden;max-width:0;min-width:0;opacity:0;transition:max-width .28s ease,opacity .28s ease;';
  const base = 'width:26px;height:26px;flex:none;border:none;border-radius:6px;background:rgba(255,255,255,0.07);color:rgba(205,222,255,0.6);cursor:pointer;font-size:13px;line-height:1;transition:color .15s,background .15s;';
  menu.innerHTML = [
    '<button id="f-minimal" style="' + base + '">❖</button>',
    '<button id="f-settings" style="' + base + '">⚙</button>',
    '<button id="f-pin" style="' + base + '">↑</button>',
    '<button id="f-min" style="' + base + '">–</button>',
    '<button id="f-max" style="' + base + '">□</button>',
    '<button id="f-close" style="' + base + '">✕</button>',
  ].join('');

  const dot = document.createElement('div');
  dot.className = 'f-float-dot';
  dot.style.cssText = 'flex:none;transition:opacity .28s ease;';

  // Halo breathing light: a steady green core + a soft glow ring that expands
  // and fades around it (the ::after pseudo-element, animated via keyframes).
  const dotStyle = document.createElement('style');
  dotStyle.textContent = '.f-float-dot{position:relative;width:8px;height:8px;border-radius:50%;background:var(--f-btn,#5ee9a0);box-shadow:0 0 6px 2px color-mix(in srgb,var(--f-btn,#5ee9a0) 55%,transparent)}.f-float-dot::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--f-btn,#5ee9a0) 60%,transparent) 0%,transparent 70%);animation:f-float-halo 2.2s ease-in-out infinite}@keyframes f-float-halo{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(3);opacity:1}}';
  document.head.appendChild(dotStyle);

  bar.append(menu, dot);
  document.documentElement.appendChild(bar);

  bar.addEventListener('mouseenter', () => { menu.style.maxWidth = '200px'; menu.style.opacity = '1'; dot.style.opacity = '0'; });
  bar.addEventListener('mouseleave', () => { menu.style.maxWidth = '0'; menu.style.opacity = '0'; dot.style.opacity = '1'; });

  // i18n: labels + tooltips follow the served SPA's active locale, which dsh
  // web reflects on <html lang> (zh -> "zh-CN", en -> "en"). Registering a
  // label applies it immediately and re-applies it whenever lang changes.
  const I18N = {
    zh: { minimal: '极简模式', toggleMinimal: '切换极简模式', settings: '设置', pin: '置顶', minimize: '最小化', maximize: '最大化', restore: '还原', close: '关闭', inputText: '输入文字', answerText: '回答文字', bgColor: '背景颜色', btnColor: '按钮颜色', opacity: '透明度', shadow: '文字阴影', reset: '恢复默认' },
    en: { minimal: 'Minimal mode', toggleMinimal: 'Toggle minimal mode', settings: 'Settings', pin: 'Always on top', minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore down', close: 'Close', inputText: 'Input text', answerText: 'Answer text', bgColor: 'Background', btnColor: 'Button color', opacity: 'Opacity', shadow: 'Text shadow', reset: 'Reset' },
  };
  const currentLang = () => ((document.documentElement.lang || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const labels = [];
  const setLabel = (el, key, attr) => {
    const value = I18N[currentLang()][key];
    if (attr === 'title') el.setAttribute('title', value);
    else if (attr === 'aria') el.setAttribute('aria-label', value);
    else el.textContent = value;
  };
  const regLabel = (el, key, attr = 'text') => {
    labels.push({ el, key, attr });
    setLabel(el, key, attr);
  };
  const minimal = document.getElementById('f-minimal');
  const pin = document.getElementById('f-pin');
  const close = document.getElementById('f-close');
  const maxBtn = document.getElementById('f-max');
  let isMaximized = false;
  let pinOn = false;

  // Maximize / restore is one toggle button: □ = maximize, ❐ = restore down.
  const updateMaxButton = (on) => {
    isMaximized = on;
    maxBtn.textContent = on ? '❐' : '□';
    const label = I18N[currentLang()][on ? 'restore' : 'maximize'];
    maxBtn.setAttribute('title', label);
    maxBtn.setAttribute('aria-label', label);
  };

  const applyLabels = () => {
    for (const { el, key, attr } of labels) setLabel(el, key, attr);
    updateMaxButton(isMaximized);
  };
  new MutationObserver(applyLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  regLabel(minimal, 'minimal', 'title');
  regLabel(minimal, 'toggleMinimal', 'aria');
  regLabel(document.getElementById('f-settings'), 'settings', 'title');
  regLabel(document.getElementById('f-settings'), 'settings', 'aria');
  regLabel(pin, 'pin', 'title');
  regLabel(document.getElementById('f-min'), 'minimize', 'title');
  regLabel(close, 'close', 'title');

  let onMinimalSettings = () => {}; // assigned by the settings block below

  const setMinimal = (on) => {
    if (on) document.documentElement.setAttribute('data-float-minimal', '');
    else document.documentElement.removeAttribute('data-float-minimal');
    minimal.style.color = on ? settings.btn : 'rgba(205,222,255,0.6)';
    onMinimalSettings(on);
    onMinimalChanged();
    saveSettings();
  };
  minimal.addEventListener('click', () => {
    setMinimal(!document.documentElement.hasAttribute('data-float-minimal'));
  });

  ipcRenderer.invoke('win:is-top').then((on) => { pinOn = on; if (on) pin.style.color = settings.btn; });
  pin.addEventListener('click', async () => {
    pinOn = await ipcRenderer.invoke('win:toggle-top');
    pin.style.color = pinOn ? settings.btn : 'rgba(205,222,255,0.6)';
  });
  document.getElementById('f-min').addEventListener('click', () => ipcRenderer.send('win:minimize'));
  maxBtn.addEventListener('click', () => ipcRenderer.send('win:toggle-max'));
  ipcRenderer.on('win:max-changed', (_e, on) => updateMaxButton(!!on));
  ipcRenderer.invoke('win:is-maximized').then(updateMaxButton);
  close.addEventListener('click', () => ipcRenderer.send('win:close'));
  close.addEventListener('mouseenter', () => { close.style.background = 'rgba(240,70,70,0.75)'; close.style.color = '#fff'; });
  close.addEventListener('mouseleave', () => { close.style.background = 'rgba(255,255,255,0.07)'; close.style.color = 'rgba(205,222,255,0.6)'; });

  // Settings: text colors + background + shadow, persisted to userData via IPC.
  // Colors are preset swatches (one click applies). The values map onto the
  // `--f-ink` / `--f-accent` / `--f-bg` / `--f-btn` / `--f-shadow` custom
  // properties skin.css reads.
  const DEFAULT_INK = '#eaf2ff';
  const DEFAULT_ACCENT = '#5ee9a0';
  const DEFAULT_BG = '#0d1430';
  const DEFAULT_BG_OPACITY = 0; // 0 = fully transparent (the default)
  const DEFAULT_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.55)';
  const DEFAULT_BTN = '#5ee9a0'; // active-state button color (send/dot/pin/settings/minimal)
  const INK_PRESETS = ['#eaf2ff', '#f8fafc', '#cbd5e1', '#0f1115', '#334155', '#fef3c7'];
  const ACCENT_PRESETS = ['#5ee9a0', '#6ee7b7', '#22d3ee', '#93c5fd', '#c4b5fd', '#f87171'];
  const BG_PRESETS = ['#0d1430', '#111827', '#0f172a', '#1e293b', '#000000', '#14532d'];
  const BTN_PRESETS = ['#5ee9a0', '#6ee7b7', '#22d3ee', '#93c5fd', '#c4b5fd', '#f87171'];
  let settings = {
    ink: savedSettings.ink ?? DEFAULT_INK,
    accent: savedSettings.accent ?? DEFAULT_ACCENT,
    bg: savedSettings.bg ?? DEFAULT_BG,
    bgOpacity: savedSettings.bgOpacity ?? DEFAULT_BG_OPACITY,
    shadow: savedSettings.shadow ?? true,
    btn: savedSettings.btn ?? DEFAULT_BTN,
  };

  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  };
  const applySettings = () => {
    document.documentElement.style.setProperty('--f-ink', settings.ink);
    document.documentElement.style.setProperty('--f-accent', settings.accent);
    document.documentElement.style.setProperty('--f-bg', 'rgba(' + hexToRgb(settings.bg) + ',' + settings.bgOpacity + ')');
    document.documentElement.style.setProperty('--f-shadow', settings.shadow ? DEFAULT_SHADOW : 'none');
    document.documentElement.style.setProperty('--f-btn', settings.btn);
    // Inline-code chip translucency: a bit more opaque than the root background
    // so it still reads as a chip, but never a solid block over a translucent
    // terminal. 1 = fully opaque (matches stock when the background is opaque).
    const codeAlpha = Math.min(1, settings.bgOpacity + 0.25);
    document.documentElement.style.setProperty('--f-code-alpha', (codeAlpha * 100) + '%');
    // Re-tint any currently-active controls after a button-color change.
    if (document.documentElement.hasAttribute('data-float-minimal')) minimal.style.color = settings.btn;
    if (pinOn) pin.style.color = settings.btn;
    if (settingsPanel.style.display === 'flex') settingsBtn.style.color = settings.btn;
  };
  const saveSettings = () => {
    try { ipcRenderer.send('settings:save', { minimal: document.documentElement.hasAttribute('data-float-minimal'), ...settings }); } catch {}
  };

  const settingsPanel = document.createElement('div');
  settingsPanel.style.cssText = 'position:fixed;top:38px;right:10px;z-index:2147483647;display:none;flex-direction:column;gap:10px;padding:12px;border-radius:12px;background:linear-gradient(180deg,rgba(32,32,38,0.97),rgba(11,11,14,0.985));color:#eaf2ff;font-family:var(--dsw-font-family,monospace);font-size:13px;border:1px solid rgba(255,255,255,0.09);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 10px 32px rgba(0,0,0,0.6);min-width:210px;cursor:default;-webkit-app-region:no-drag;';

  // Custom color = the trailing swatch (shows the live color); clicking it
  // toggles an inline R/G/B editor. A stable cross-platform replacement for
  // the native <input type=color> picker (broken on Windows, worse on Linux).
  const PRESETS = { ink: INK_PRESETS, accent: ACCENT_PRESETS, bg: BG_PRESETS, btn: BTN_PRESETS };
  const hexToRgbObj = (hex) => {
    const n = parseInt(String(hex).replace(/^#/, ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => {
    const c = Math.max(0, Math.min(255, Math.round(v)));
    return c.toString(16).padStart(2, '0');
  }).join('');
  const customSwatches = {}; // kind -> trailing swatch button
  const rgbEditors = {};      // kind -> { row, preview, r, g, b }
  const syncColorUI = () => {
    for (const k in customSwatches) {
      customSwatches[k].style.background = settings[k];
      const ed = rgbEditors[k];
      if (!ed) continue;
      ed.preview.style.background = settings[k];
      const { r, g, b } = hexToRgbObj(settings[k]);
      ed.r.value = String(r);
      ed.g.value = String(g);
      ed.b.value = String(b);
    }
  };
  const closeRgbEditors = () => { for (const k in rgbEditors) rgbEditors[k].row.style.display = 'none'; };
  const rgbStyle = document.createElement('style');
  rgbStyle.textContent = '.f-rgb{box-sizing:border-box;width:40px;height:20px;padding:0 4px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;background:rgba(255,255,255,0.06);color:rgba(205,222,255,0.85);font-family:inherit;font-size:11px;line-height:18px;outline:none;transition:border-color .15s}.f-rgb:focus{border-color:rgba(94,233,160,0.6)}.f-rgb::-webkit-outer-spin-button,.f-rgb::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}.f-rgb{-moz-appearance:textfield}';
  document.head.appendChild(rgbStyle);

  const swatchRow = (key, kind, presets) => {
    const frag = document.createDocumentFragment();
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
    const name = document.createElement('span');
    name.style.cssText = 'line-height:18px;white-space:nowrap;';
    regLabel(name, key);
    const strip = document.createElement('div');
    strip.style.cssText = 'display:flex;align-items:center;gap:4px;';
    presets.forEach((color) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.title = color;
      sw.dataset.kind = kind;
      sw.dataset.color = color;
      sw.style.cssText = 'box-sizing:border-box;width:18px;height:18px;border-radius:50%;border:2px solid transparent;background:' + color + ';cursor:pointer;padding:0;box-shadow:0 0 0 1px rgba(255,255,255,0.15);';
      strip.appendChild(sw);
    });
    const custom = document.createElement('button');
    custom.type = 'button';
    custom.dataset.kind = kind;
    custom.dataset.custom = '1';
    custom.style.cssText = 'box-sizing:border-box;width:18px;height:18px;border-radius:50%;border:2px solid transparent;background:' + settings[kind] + ';cursor:pointer;padding:0;box-shadow:0 0 0 1px rgba(255,255,255,0.28);';
    customSwatches[kind] = custom;
    const right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:4px;';
    right.append(strip, custom);
    row.append(name, right);
    frag.append(row);

    const rgbRow = document.createElement('div');
    rgbRow.style.cssText = 'display:none;align-items:center;gap:6px;padding:0 0 2px;';
    const preview = document.createElement('span');
    preview.style.cssText = 'box-sizing:border-box;flex:none;width:18px;height:18px;border-radius:50%;background:' + settings[kind] + ';box-shadow:0 0 0 1px rgba(255,255,255,0.15);';
    const mkField = (label) => {
      const wrap = document.createElement('label');
      wrap.style.cssText = 'display:flex;align-items:center;gap:3px;color:rgba(205,222,255,0.55);font-size:10px;';
      const t = document.createElement('span');
      t.textContent = label;
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'f-rgb';
      inp.min = '0';
      inp.max = '255';
      inp.step = '1';
      wrap.append(t, inp);
      return inp;
    };
    const rInp = mkField('R');
    const gInp = mkField('G');
    const bInp = mkField('B');
    const readRgb = () => {
      const v = [rInp.value, gInp.value, bInp.value];
      if (v.some((x) => x === '' || Number.isNaN(Number(x)))) return null;
      return rgbToHex(Number(v[0]), Number(v[1]), Number(v[2]));
    };
    const applyRgb = (persist) => {
      const v = readRgb();
      if (v === null) return;
      settings[kind] = v;
      preview.style.background = v;
      custom.style.background = v;
      highlightAll();
      applySettings();
      if (persist) saveSettings();
    };
    [rInp, gInp, bInp].forEach((inp) => {
      inp.addEventListener('input', () => applyRgb(false));
      inp.addEventListener('change', () => { if (readRgb() === null) syncColorUI(); else applyRgb(true); });
    });
    rgbRow.append(preview, rInp.parentElement, gInp.parentElement, bInp.parentElement);
    rgbEditors[kind] = { row: rgbRow, preview, r: rInp, g: gInp, b: bInp };
    frag.append(rgbRow);

    custom.addEventListener('click', () => {
      const open = rgbRow.style.display !== 'flex';
      closeRgbEditors();
      if (open) {
        syncColorUI();
        rgbRow.style.display = 'flex';
      }
    });

    return frag;
  };
  settingsPanel.append(swatchRow('inputText', 'ink', INK_PRESETS), swatchRow('answerText', 'accent', ACCENT_PRESETS), swatchRow('bgColor', 'bg', BG_PRESETS), swatchRow('btnColor', 'btn', BTN_PRESETS));

  const opacityRow = document.createElement('div');
  opacityRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
  const opacityName = document.createElement('span');
  opacityName.style.cssText = 'line-height:18px;';
  regLabel(opacityName, 'opacity');
  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range';
  opacitySlider.min = '0';
  opacitySlider.max = '100';
  opacitySlider.style.cssText = 'flex:1;cursor:pointer;';
  opacityRow.append(opacityName, opacitySlider);
  settingsPanel.append(opacityRow);

  const shadowRow = document.createElement('div');
  shadowRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
  const shadowName = document.createElement('span');
  shadowName.style.cssText = 'line-height:18px;';
  regLabel(shadowName, 'shadow');
  const shadowInput = document.createElement('input');
  shadowInput.type = 'checkbox';
  shadowInput.style.cursor = 'pointer';
  shadowRow.append(shadowName, shadowInput);
  settingsPanel.append(shadowRow);

  const resetBtn = document.createElement('button');
  resetBtn.style.cssText = 'border:none;border-radius:6px;padding:4px 0;background:rgba(255,255,255,0.07);color:rgba(205,222,255,0.8);font-family:inherit;font-size:12px;cursor:pointer;';
  regLabel(resetBtn, 'reset');
  settingsPanel.append(resetBtn);
  document.documentElement.appendChild(settingsPanel);

  const settingsBtn = document.getElementById('f-settings');
  const highlightAll = () => {
    settingsPanel.querySelectorAll('[data-kind]').forEach((sw) => {
      const active = sw.dataset.custom === '1'
        ? !PRESETS[sw.dataset.kind].includes(settings[sw.dataset.kind])
        : sw.dataset.color === settings[sw.dataset.kind];
      sw.style.borderColor = active ? '#fff' : 'transparent';
    });
  };
  const syncInputs = () => {
    shadowInput.checked = settings.shadow;
    opacitySlider.value = String(Math.round(settings.bgOpacity * 100));
    highlightAll();
    syncColorUI();
  };

  const closeSettings = () => { settingsPanel.style.display = 'none'; settingsBtn.style.color = 'rgba(205,222,255,0.6)'; closeRgbEditors(); };
  // The settings channel is minimal-only: hide its button in full mode, and
  // close an open panel when switching away from minimal.
  onMinimalSettings = (on) => {
    settingsBtn.style.display = on ? '' : 'none';
    if (!on) closeSettings();
  };
  settingsBtn.addEventListener('click', () => {
    if (settingsPanel.style.display === 'flex') { closeSettings(); return; }
    syncInputs();
    settingsPanel.style.display = 'flex';
    settingsBtn.style.color = settings.btn;
  });
  settingsPanel.addEventListener('click', (e) => {
    const sw = e.target.closest('button[data-kind]');
    if (sw === null) return;
    settings[sw.dataset.kind] = sw.dataset.color;
    highlightAll();
    applySettings();
    saveSettings();
    syncColorUI();
  });
  shadowInput.addEventListener('change', () => { settings.shadow = shadowInput.checked; applySettings(); saveSettings(); });
  opacitySlider.addEventListener('input', () => { settings.bgOpacity = Number(opacitySlider.value) / 100; applySettings(); saveSettings(); });
  resetBtn.addEventListener('click', () => {
    settings = { ink: DEFAULT_INK, accent: DEFAULT_ACCENT, bg: DEFAULT_BG, bgOpacity: DEFAULT_BG_OPACITY, shadow: true, btn: DEFAULT_BTN };
    syncInputs();
    applySettings();
    saveSettings();
  });
  document.addEventListener('click', (e) => {
    if (settingsPanel.style.display !== 'flex') return;
    if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) closeSettings();
  });

  syncInputs();
  applySettings();

  // Start in the last-used mode (persisted), defaulting to minimal ON.
  setMinimal(initialMinimal);
}

/* Show the session's context occupancy as plain `used/contextWindow` text
   (e.g. `8K/1M`) appended to the bottom stats bar (the turn-tail node), only
   in minimal mode. The figures live in the context meter's click-open panel;
   we open it programmatically, read `~used / total`, and close it. React 18
   batches `setState(!open)` across two synchronous clicks (both use the stale
   closure), so the read+close runs on the next macrotask; the panel is kept
   invisible by skin.css the whole time, so there is no flash. */
function installContextText() {
  let trigger = null;
  let attrObserver = null;
  let tail = null;
  let textEl = null;
  let reading = false;

  const minimalOn = () => document.documentElement.hasAttribute('data-float-minimal');

  function readFigures(cb) {
    if (!trigger || reading) { cb && cb(null); return; }
    reading = true;
    const wasOpen = trigger.getAttribute('aria-expanded') === 'true';
    if (!wasOpen) trigger.click();
    setTimeout(() => {
      try {
        let out = null;
        const panel = document.querySelector('[role="dialog"][aria-label="上下文已用"], [role="dialog"][aria-label="of context used"]');
        if (panel) {
          const m = panel.textContent.replace(/\s+/g, ' ').match(/~\s*([\d.]+[KM]?)\s*\/\s*([\d.]+[KM]?)/);
          if (m) out = m[1] + '/' + m[2];
        }
        if (!wasOpen) trigger.click(); // close (fresh closure now)
        cb && cb(out);
      } finally {
        reading = false;
      }
    }, 0);
  }

  function ensureText() {
    if (!minimalOn() || !tail) {
      if (textEl) { textEl.remove(); textEl = null; }
      return false;
    }
    if (!textEl) {
      textEl = document.createElement('span');
      textEl.className = 'f-context-text';
    }
    if (textEl.parentElement !== tail) tail.appendChild(textEl);
    return true;
  }

  function refresh() {
    if (!ensureText()) return;
    readFigures((fig) => {
      if (ensureText() && fig) textEl.textContent = fig;
    });
  }

  const bodyMo = new MutationObserver(() => {
    const t = document.querySelector('button[aria-label^="上下文已用"], button[aria-label$=" of context used"]');
    if (t !== trigger) {
      if (attrObserver) { attrObserver.disconnect(); attrObserver = null; }
      trigger = t;
      if (trigger) {
        attrObserver = new MutationObserver(() => refresh());
        attrObserver.observe(trigger, { attributes: true, attributeFilter: ['aria-label'] });
      }
    }
    const tl = document.querySelector('[data-chat-flow-kind="turn-tail"]');
    if (tl !== tail) {
      tail = tl;
      if (textEl) { textEl.remove(); textEl = null; }
      if (tl) refresh();
    } else if (textEl && textEl.parentElement !== tail && minimalOn() && tail) {
      // React re-rendered the stats line and wiped our span; re-attach it.
      tail.appendChild(textEl);
    }
  });
  bodyMo.observe(document.body, { childList: true, subtree: true });

  onMinimalChanged = refresh;
}

/* Immersion: show the conversation scrollbar only while the mouse is moving,
   then fade it out after a short idle period. */
function installScrollbarReveal() {
  let timer = null;
  const show = () => {
    document.documentElement.classList.add('f-scroll');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => document.documentElement.classList.remove('f-scroll'), 1000);
  };
  document.addEventListener('mousemove', show, { passive: true });
  document.addEventListener('wheel', show, { passive: true });
}

/* Tell the shell once the SPA has mounted its surface, so the window can stay
   hidden through the white loader and appear already-minimal. Two animation
   frames let the skinned surface paint once before the window shows. */
function notifyAppReady() {
  const READY_SELECTOR = '[data-slot="conversation"]';
  const done = () => requestAnimationFrame(() => requestAnimationFrame(() => ipcRenderer.send('app:ready')));
  if (document.querySelector(READY_SELECTOR)) { done(); return; }
  const observer = new MutationObserver(() => {
    if (document.querySelector(READY_SELECTOR)) { observer.disconnect(); done(); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { notifyAppReady(); injectControls(); installContextText(); installScrollbarReveal(); });
} else {
  notifyAppReady();
  injectControls();
  installContextText();
  installScrollbarReveal();
}

contextBridge.exposeInMainWorld('floatApp', {
  minimize: () => ipcRenderer.send('win:minimize'),
  close: () => ipcRenderer.send('win:close'),
  toggleTop: () => ipcRenderer.invoke('win:toggle-top'),
  isTop: () => ipcRenderer.invoke('win:is-top'),
});

'use strict';

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// On GNOME Wayland, transparent frameless windows are most reliable over X11.
if (process.platform === 'linux' && !process.env.ELECTRON_OZONE_PLATFORM_HINT) {
  process.env.ELECTRON_OZONE_PLATFORM_HINT = 'x11';
}
app.commandLine.appendSwitch('no-sandbox');

/* Stable userData dir for persisted settings (independent of the shell's
   package.json name, which lives inside node_modules and can change). */
app.setName('dsh-float');

let win = null;
let savedBounds = null; // pre-maximize bounds, for a deterministic restore
let maximized = false;  // transparent frameless windows report isMaximized()/events unreliably

/* Read the skin once and inject it at `dom-ready` — before the SPA's first
   content paint — so the window's first visible frame is already minimal. */
const SKIN_CSS = (() => {
  try { return fs.readFileSync(path.join(__dirname, 'skin.css'), 'utf8'); }
  catch { return ''; } // an empty skin is a no-op; the page still loads un-skinned
})();

/* Never leave the window stuck invisible: if the SPA does not signal ready
   (e.g. the page fails to boot), show whatever is there after this long.
   Generous on purpose — it is a last resort, not a normal-path timer. */
const READY_TIMEOUT_MS = 30000;

/* Keep the window hidden through the SPA's white loader, then show it once the
   surface has mounted (preload sends `app:ready`) — already skinned, so the
   first visible frame is the minimal UI with no loader or full-chrome flash. */
function showWhenSpaReady(win) {
  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    if (!win.isDestroyed()) win.show();
  };

  win.webContents.on('dom-ready', () => { win.webContents.insertCSS(SKIN_CSS).catch(() => {}); });
  ipcMain.on('app:ready', show);
  win.once('closed', () => { ipcMain.removeListener('app:ready', show); });
  setTimeout(show, READY_TIMEOUT_MS);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 800,
    minWidth: 680,
    minHeight: 480,
    frame: false,
    transparent: true,
    resizable: true,
    maximizable: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: false,
    title: 'DeepSeek Float',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  const url = process.env.DSH_FLOAT_URL;
  if (url) {
    win.loadURL(url);
    // Stay hidden through the SPA's white loader; show only after its surface
    // mounts, already skinned (see showWhenSpaReady).
    showWhenSpaReady(win);
  } else {
    const html = '<body style="background:transparent;font-family:monospace;color:#8fb9ff;padding:40px;margin:0">'
      + '<h3 style="font-weight:400">DeepSeek Float</h3>'
      + '<p style="opacity:.7">请用 <code>dsh --profile float</code> 启动。</p></body>';
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    win.once('ready-to-show', () => win.show());
  }

  win.webContents.on('did-finish-load', () => {
    // Debug: dump the runtime DOM tree + theme tokens (DSH_FLOAT_DUMP_DOM=/path).
    if (process.env.DSH_FLOAT_DUMP_DOM) {
      setTimeout(async () => {
        try {
          const dom = await win.webContents.executeJavaScript(`(() => {
            const describe = (el, d) => {
              if (d > 26) return '…';
              const a = [];
              if (el.id) a.push('#' + el.id);
              if (el.getAttribute('role')) a.push('[role=' + el.getAttribute('role') + ']');
              if (el.getAttribute('aria-label')) a.push('[aria-label="' + el.getAttribute('aria-label').slice(0, 32) + '"]');
              for (const x of el.attributes) if (x.name.startsWith('data-')) a.push('[' + x.name + '=' + JSON.stringify(String(x.value).slice(0, 24)) + ']');
              const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(/\\s+/).filter(Boolean).slice(0, 4).join('.') : '';
              const tag = el.tagName.toLowerCase() + cls + a.join('');
              const kids = [...el.children].map((c) => describe(c, d + 1));
              if (kids.length) return { t: tag, c: kids };
              const txt = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
              return txt ? tag + ' "' + txt + '"' : tag;
            };
            const toks = {};
            const cs = getComputedStyle(document.body);
            for (const v of ['--dsw-alias-bg-base','--dsw-alias-bg-layer-1','--dsw-alias-bg-layer-2','--dsw-alias-label-primary','--dsw-alias-label-secondary','--dsw-alias-brand-primary','--dsw-alias-border-l2','--dsw-font-family','--dsw-specific-bubble','--dsw-static-deepseek-500','--dsw-static-green-500']) {
              toks[v] = cs.getPropertyValue(v).trim();
            }
            const rects = {};
            const probe = (label, sel) => {
              const el = document.querySelector(sel);
              if (!el) { rects[label] = null; return; }
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              rects[label] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: s.display, visibility: s.visibility, overflow: s.overflow };
            };
            probe('frame', '[data-slot="root"] > div');
            probe('sidebarCol', '[data-slot="sidebar"]');
            probe('detailsCol', '[data-slot="details"]');
            probe('conversation', '[data-slot="conversation"]');
            probe('root', '[data-slot="conversation"] > div');
            probe('scrollBody', '[data-conversation-scroll]');
            probe('composerSeat', '[data-composer-seat]');
            probe('composerCard', '[data-composer-card]');
            probe('textarea', 'textarea');
            probe('sendBtn', 'button[aria-label="发送消息"]');
            probe('trailing', '[data-slot="conversation.input.model"]');
            const vis = {};
            const vprobe = (label, sel) => {
              const el = document.querySelector(sel);
              if (!el) { vis[label] = 'MISSING'; return; }
              const s = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              vis[label] = { display: s.display, fd: s.flexDirection, flex: s.flex, minW: s.minWidth, w: Math.round(r.width), h: Math.round(r.height) };
            };
            vprobe('whaleHeadline', '[data-phase="hero"] .pXSMma_headline, [data-phase="hero"] span[class*="headlineText"]');
            vprobe('commandsBtn', 'button[aria-label="命令"]');
            vprobe('modelBtn', 'button[aria-label^="选择模型"]');
            vprobe('workspaceBtn', 'button[aria-label="选择工作区"]');
            vprobe('header', '[data-slot="conversation.session.header"]');
            vprobe('scroll', '[data-input-scroll]');
            vprobe('row', '[data-composer-card] > div:has(> [class*="trailing"])');
            vprobe('trailing', '[data-composer-card] [class*="trailing"]');
            vprobe('meterRoot', 'button[aria-label^="上下文已用"]');
            const html = {};
            const hprobe = (label, sel) => {
              const el = document.querySelector(sel);
              html[label] = el ? el.outerHTML.replace(/\\s+/g, ' ').slice(0, 6000) : null;
            };
            hprobe('composerCard', '[data-composer-card]');
            hprobe('hero', '[data-slot="conversation"] [data-phase="hero"]');
            hprobe('header', '[data-slot="conversation.session"] header');
            hprobe('controls', 'body > .f-float-controls, #f-float-bar');
            return JSON.stringify({ dark: document.body.hasAttribute('data-ds-dark-theme'), toks, rects, vis, html, tree: describe(document.body, 0) });
          })()`);
          fs.writeFileSync(process.env.DSH_FLOAT_DUMP_DOM, dom);
          console.log('DOM_DUMPED', process.env.DSH_FLOAT_DUMP_DOM);
          try {
            const img = await win.webContents.capturePage();
            fs.writeFileSync(process.env.DSH_FLOAT_DUMP_DOM + '.png', img.toPNG());
            console.log('SHOT_SAVED', process.env.DSH_FLOAT_DUMP_DOM + '.png');
          } catch (e2) { console.error('SHOT_ERR', e2.message); }
        } catch (e) { console.error('DOM_DUMP_ERR', e.message); }
        app.quit();
      }, 6000);
    }

    // Debug: type a message into the SPA composer and send it, then dump the
    // resulting chat nodes + screenshot (DSH_FLOAT_TEST_SEND="text").
    if (process.env.DSH_FLOAT_TEST_SEND) {
      setTimeout(async () => {
        try {
          const r = await win.webContents.executeJavaScript(`(() => {
            const ta = document.querySelector('[data-composer-card] textarea') || document.querySelector('textarea');
            if (!ta) return 'NO_COMPOSER';
            const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            set.call(ta, ${JSON.stringify(process.env.DSH_FLOAT_TEST_SEND)});
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
            return 'SENT';
          })()`);
          console.log('TEST_SEND:', r);
        } catch (e) { console.error('TEST_SEND_ERR', e.message); }
        setTimeout(async () => {
          try {
            const dom = await win.webContents.executeJavaScript(`(() => {
              const nodes = [...document.querySelectorAll('[data-chat-flow-kind]')].map((n) => ({
                kind: n.getAttribute('data-chat-flow-kind'),
                text: n.textContent.replace(/\\s+/g, ' ').slice(0, 120),
              }));
              const header = document.querySelector('[data-slot="conversation.session.header"]');
              const buttons = [...document.querySelectorAll('button')].map((b) => {
                const r = b.getBoundingClientRect();
                return { label: b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
              }).filter((b) => b.w > 0 && b.h > 0 && b.y < 60);
              const composer = document.querySelector('[data-composer-card]');
              const meter = document.querySelector('button[aria-label^="上下文已用"]');
              const ctxTest = (() => {
                const tr = meter;
                if (!tr) return 'NO_METER';
                const wasOpen = tr.getAttribute('aria-expanded') === 'true';
                if (!wasOpen) tr.click();
                const panel = document.querySelector('[role="dialog"][aria-label="上下文已用"]');
                const txt = panel ? panel.textContent.replace(/\\s+/g, ' ').slice(0, 200) : null;
                if (!wasOpen) tr.click();
                return { wasOpen, panelFound: !!panel, txt };
              })();
              const assistant = document.querySelector('[data-chat-flow-kind="assistant-step"]');
              const colors = {};
              for (const [label, sel] of [
                ['thinkBody', '[class*="thinkBody"]'],
                ['thinkSummary', '[class*="summary"]'],
                ['toolRoot', '[data-tool]'],
                ['disclosureTitle', '[data-disclosure-row] span'],
              ]) {
                const el = document.querySelector(sel);
                colors[label] = el ? getComputedStyle(el).color : null;
              }
              const userNode = document.querySelector('[data-chat-flow-kind="user"]');
              const timeEl = userNode && userNode.querySelector('[class*="timeStart"], [class*="timeEnd"]');
              const actionEl = userNode && userNode.querySelector('[class*="action"]');
              colors.userHtml = userNode ? userNode.outerHTML.replace(/\\s+/g, ' ').slice(0, 2500) : null;
              colors.time = timeEl ? { opacity: getComputedStyle(timeEl).opacity, color: getComputedStyle(timeEl).color, x: Math.round(timeEl.getBoundingClientRect().x) } : null;
              colors.action = actionEl ? { color: getComputedStyle(actionEl).color, x: Math.round(actionEl.getBoundingClientRect().x) } : null;
              const toolCall = document.querySelector('[data-chat-flow-kind="tool-call"]');
              if (toolCall) {
                const s = getComputedStyle(toolCall);
                colors.toolCallTertiary = s.getPropertyValue('--dsw-alias-label-tertiary').trim();
                colors.toolCallSecondary = s.getPropertyValue('--dsw-alias-label-secondary').trim();
                colors.toolCallColor = s.color;
                colors.toolCallHtml = toolCall.outerHTML.replace(/\\s+/g, ' ').slice(0, 3000);
              }
              return JSON.stringify({ nodes, header: header ? header.outerHTML.replace(/\\s+/g, ' ').slice(0, 4000) : null, topButtons: buttons, composer: composer ? composer.outerHTML.replace(/\\s+/g, ' ').slice(0, 8000) : null, meter: meter ? meter.parentElement.outerHTML.replace(/\\s+/g, ' ').slice(0, 2000) : null, ctxTest, colors, assistantHtml: assistant ? assistant.outerHTML.replace(/\\s+/g, ' ').slice(0, 12000) : null });
            })()`);
            fs.writeFileSync('/tmp/test_send_dom.json', dom);
            const img = await win.webContents.capturePage();
            fs.writeFileSync('/tmp/test_send.png', img.toPNG());
            console.log('TEST_SEND_DUMPED');
          } catch (e) { console.error('TEST_SEND_DUMP_ERR', e.message); }
          app.quit();
        }, 50000);
      }, 9000);
    }
  });

  // Native maximize/restore can still happen via Aero Snap; resync our manual
  // state (and best-effort capture the normal bounds) so the button stays true.
  win.on('maximize', () => {
    maximized = true;
    if (!savedBounds) { try { savedBounds = win.getNormalBounds(); } catch {} }
    win.webContents.send('win:max-changed', true);
  });
  win.on('unmaximize', () => {
    maximized = false;
    win.webContents.send('win:max-changed', false);
  });
  win.on('closed', () => { win = null; });
}

/* ------------------------------------------------------------- IPC ------ */
ipcMain.on('win:minimize', () => { if (win) win.minimize(); });
ipcMain.on('win:close', () => { if (win) win.close(); });
ipcMain.on('win:toggle-max', () => {
  if (!win) return;
  if (maximized) {
    if (savedBounds) win.setBounds(savedBounds);
    else win.unmaximize();
    maximized = false;
  } else {
    savedBounds = win.getBounds();
    const { workArea } = screen.getDisplayMatching(savedBounds);
    win.setBounds(workArea);
    maximized = true;
  }
  win.webContents.send('win:max-changed', maximized);
});
ipcMain.handle('win:toggle-top', () => {
  if (!win) return false;
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next, 'floating');
  return next;
});
ipcMain.handle('win:is-top', () => !!(win && win.isAlwaysOnTop()));
ipcMain.handle('win:is-maximized', () => maximized);

/* ---- persisted UI state (minimal mode + appearance) ----
   Stored under userData (stable across launches, unlike the SPA's random-port
   origin), read synchronously at preload time so the first paint already
   matches the last-used mode. */
const DEFAULT_SETTINGS = { minimal: true, ink: '#eaf2ff', accent: '#5ee9a0', bg: '#0d1430', bgOpacity: 0, shadow: true };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const loadSettings = () => {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; }
  catch { return { ...DEFAULT_SETTINGS }; }
};
const saveSettings = (next) => {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify({ ...DEFAULT_SETTINGS, ...next }));
  } catch (e) { console.error('dsh-float: settings save failed:', e.message); }
};
ipcMain.on('settings:load-sync', (e) => { e.returnValue = loadSettings(); });
ipcMain.on('settings:save', (e, next) => { saveSettings(next); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/**
 * dsh plugin runner for the DeepSeek Float Electron shell — the REAL dsh web
 * UI, served by the surrounding profile's web-app bundle, loaded in a
 * borderless transparent Electron window (no browser).
 *
 * Self-contained: the Electron shell (shell/main.js + preload.js + skin.css +
 * icon.png) ships inside this plugin, and `electron` is a declared dependency,
 * so installing the plugin is enough — no browser, no external app directory.
 *
 *     dsh plugin --profile float add <tarball>
 *     dsh --profile float
 *
 * The profile composes base + web-app, so the SPA and the /api transport are
 * already up when this plugin activates. It only reads the bound port and
 * spawns Electron pointed at http://127.0.0.1:<port>/; closing the window
 * disposes the whole runtime. No custom protocol — the SPA talks to the
 * backend exactly as it does in a browser.
 */

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// The bundled Electron shell directory (relative to this plugin's location).
const HERE = path.dirname(fileURLToPath(import.meta.url)) // .../lib
const SHELL_DIR = path.resolve(HERE, '..', 'shell') // .../shell

export const name = 'float-runner'
export const inject = ['webServer']

/* Resolve the Electron binary. `electron` (a dependency) exports its binary
   path as its module export; an env override lets a deployment point at its
   own binary if it doesn't want the bundled one. */
function electronBinary() {
  const require = createRequire(import.meta.url)
  const bin = process.env.DSH_FLOAT_ELECTRON || require('electron')
  if (typeof bin !== 'string' || !fs.existsSync(bin)) {
    throw new Error(
      `@zaralinux/dsh-float: electron binary not found (${bin}) — ` +
        'reinstall the plugin so its `electron` dependency is present, or set DSH_FLOAT_ELECTRON',
    )
  }
  return bin
}

/* Platform-specific launch args. Linux: transparent frameless windows are most
   reliable over X11, and the chrome-sandbox SUID bit is often missing, so
   disable the sandbox. Windows/macOS need neither. */
function electronArgs() {
  const args = [SHELL_DIR]
  if (process.platform === 'linux') args.push('--no-sandbox')
  return args
}

function electronEnv(url) {
  const env = { ...process.env, DSH_FLOAT_URL: url }
  if (process.platform === 'linux' && !env.ELECTRON_OZONE_PLATFORM_HINT) {
    env.ELECTRON_OZONE_PLATFORM_HINT = 'x11'
  }
  return env
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  const host = webServer.host === '0.0.0.0' ? '127.0.0.1' : webServer.host
  const url = `http://${host}:${webServer.port}/`

  const child = spawn(electronBinary(), electronArgs(), {
    stdio: 'ignore',
    env: electronEnv(url),
  })

  let closing = false
  let exitTask
  const disposeAndExit = (code) => {
    exitTask ??= (async () => {
      closing = true
      await Promise.allSettled([Promise.resolve().then(() => ctx.root.fiber.dispose())])
      process.exit(code)
    })()
    return exitTask
  }

  child.on('exit', (code) => {
    if (closing) return
    void disposeAndExit(code === null ? 0 : code)
  })
  child.on('error', (err) => {
    if (closing) return
    console.error(`float-runner failed: ${err.message}`)
    void disposeAndExit(1)
  })

  ctx.effect(() => {
    return () => {
      closing = true
      try { child.kill('SIGTERM') } catch {}
    }
  }, 'dsh-float.shell')
}

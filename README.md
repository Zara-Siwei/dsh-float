**English** | [简体中文](README.zh-CN.md)

# DeepSeek Float

A dsh bundle that runs the DeepSeek Harness Web UI in a borderless, translucent Electron window — a floating, terminal-style overlay in minimal mode.

## Install

Prerequisites: the `dsh` CLI on `PATH`, Node.js ≥ 18, `pnpm`, `git`.

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

Then set `~/.dsh/profiles/float/package.json` → `dsh.profile.bundles` to:

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

## Usage

```powershell
dsh --profile float
```

**Minimal mode** (default) — a floating terminal-style overlay on your desktop:

![Desktop Screenshot](imgs_for_show/Desktop%20Screenshot.png)

**Appearance settings** — ⚙ (minimal mode only): text colors, background color & opacity, text shadow; labels follow dsh's own language:

![Appearance Settings](imgs_for_show/Appearance%20Settings.png)

**Full mode** — turn off minimal mode (❖) to get the stock dsh web UI:

![Screenshot with Minimalist Mode Disabled](imgs_for_show/Screenshot%20with%20Minimalist%20Mode%20Disabled.png)

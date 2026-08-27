**English** | [简体中文](README.zh-CN.md)

# DeepSeek Float

A dsh bundle that runs the DeepSeek Harness Web UI in a borderless, translucent Electron window — a floating, terminal-style overlay in minimal mode.

## Install

Prerequisites: the `dsh` CLI on `PATH`, Node.js ≥ 18, `pnpm`, `git`.

**1. Install the bundle:**

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

**2. Add its `dsh-web-app` base** — dsh has no automatic bundle dependencies, so paste this in PowerShell:

```powershell
$p = "$HOME\.dsh\profiles\float\package.json"
$j = Get-Content $p -Raw | ConvertFrom-Json
$b = [System.Collections.Generic.List[string]]@($j.dsh.profile.bundles)
if (-not $b.Contains('@deepseek-ai/dsh-web-app')) {
  $i = $b.IndexOf('@zaralinux/dsh-float')
  if ($i -lt 0) { $i = $b.Count }
  $b.Insert($i, '@deepseek-ai/dsh-web-app')
  $j.dsh.profile.bundles = $b.ToArray()
  [System.IO.File]::WriteAllText($p, ($j | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false)))
}
```

Equivalent manual edit: open `~/.dsh/profiles/float/package.json` and insert `"@deepseek-ai/dsh-web-app",` between `"@deepseek-ai/dsh-base",` and `"@zaralinux/dsh-float",` inside `dsh.profile.bundles`.

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

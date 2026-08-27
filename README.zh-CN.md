[English](README.md) | **简体中文**

# DeepSeek Float

一个 dsh bundle：把 DeepSeek Harness 的 Web 界面装进无边框半透明 Electron 窗口，极简模式下是悬浮在桌面上的「终端式」透明界面。

## 安装

前置条件：`dsh` 在 PATH 上、Node.js ≥ 18、`pnpm`、`git`。

**1. 安装 bundle：**

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

**2. 补上它的 `dsh-web-app` 底座**——dsh 没有 bundle 自动依赖，把下面这段粘贴到 PowerShell 里跑：

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

等价的手动改法：打开 `~/.dsh/profiles/float/package.json`，在 `dsh.profile.bundles` 里把 `"@deepseek-ai/dsh-web-app",` 插到 `"@deepseek-ai/dsh-base",` 和 `"@zaralinux/dsh-float",` 之间。

## 使用

```powershell
dsh --profile float
```

**极简模式**（默认）——悬浮在桌面上的终端式透明界面：

![Desktop Screenshot](imgs_for_show/Desktop%20Screenshot.png)

**外观设置**——⚙（仅极简模式）：文字颜色、背景颜色与透明度、文字阴影；文字跟随 dsh 自身语言：

![Appearance Settings](imgs_for_show/Appearance%20Settings.png)

**完整模式**——关掉极简（❖）回归 dsh web 原生界面：

![Screenshot with Minimalist Mode Disabled](imgs_for_show/Screenshot%20with%20Minimalist%20Mode%20Disabled.png)

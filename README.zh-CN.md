[English](README.md) | **简体中文**

# DeepSeek Float

一个 dsh bundle：把 DeepSeek Harness 的 Web 界面装进无边框半透明 Electron 窗口，极简模式下是悬浮在桌面上的「终端式」透明界面。

## 安装

前置条件：`dsh` 在 PATH 上、Node.js ≥ 18、`pnpm`、`git`。

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

然后把 `~/.dsh/profiles/float/package.json` 的 `dsh.profile.bundles` 设为：

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

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

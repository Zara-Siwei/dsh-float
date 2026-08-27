[English](README.md) | **简体中文**

# DeepSeek Float

dsh web 界面的一层极简皮肤——把真实的 DeepSeek Harness Web 界面装进无边框半透明 Electron 窗口。极简模式下是悬浮的「终端式」透明界面；关掉极简就回到原汁原味的 dsh web，什么都没少。它是盖在 `dsh-web-app` 上的一层薄皮肤（不是 fork），只保留了几个必要入口，所以 dsh 内核更新会自然透传、不受影响。

## 安装

前置条件：`dsh` 在 PATH 上、Node.js ≥ 18、`pnpm`、`git`。

```powershell
dsh plugin --profile web add github:Zara-Siwei/dsh-float
```

## 运行

```powershell
dsh --profile web
```

**极简模式**（默认）——悬浮在桌面上的终端式透明界面：

![Desktop Screenshot](imgs_for_show/Desktop%20Screenshot.png)

**外观设置**——⚙（仅极简模式）：文字颜色、背景颜色与透明度、文字阴影；文字跟随 dsh 自身语言：

![Appearance Settings](imgs_for_show/Appearance%20Settings.png)

**完整模式**——关掉极简（❖）回归 dsh web 原生界面：

![Screenshot with Minimalist Mode Disabled](imgs_for_show/Screenshot%20with%20Minimalist%20Mode%20Disabled.png)

## 卸载

```powershell
dsh plugin --profile web remove @zaralinux/dsh-float
```

之后 `dsh --profile web` 恢复为正常的浏览器界面。

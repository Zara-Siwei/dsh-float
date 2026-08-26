# DeepSeek Float

把 dsh（DeepSeek Harness）的 Web 界面装进无边框半透明 Electron 窗口的外部插件。极简模式下是悬浮在桌面上的「终端式」透明界面；完整模式则回归 dsh web 原生界面。关窗即退出整个运行时。

![浮动终端界面](imgs_for_show/Desktop%20Screenshot.png)

## 快速开始

> 下文 `<plugin-dir>` 指你克隆/存放本插件的绝对路径。前置条件：`dsh` 在 PATH 上、`node` ≥ 18、`pnpm`。

```powershell
git clone https://github.com/Zara-Siwei/dsh-float.git
cd dsh-float
pnpm install                      # 装 electron
dsh plugin --profile float add link:<plugin-dir>
```

打开 `~/.dsh/profiles/float/package.json`，确认 `dsh.profile.bundles` 为（顺序不能乱）：

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

启动：

```powershell
dsh --profile float
```

Windows 下也可双击 `float.vbs`（无窗口直接弹界面）。

> **electron 二进制下载失败（国内网络）**：`$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'; node node_modules/electron/install.js`

## 界面与设置

- **极简模式**（默认）：侧栏、详情、头部都收起，右上角是一个会呼吸的绿色光点，悬停展开按钮（❖ 切换极简/完整、⚙ 设置、↑ 置顶、– □ ✕）。
- **⚙ 外观设置**：文字颜色、背景颜色与透明度、文字阴影，自动记忆：

  ![外观设置](imgs_for_show/Appearance%20Settings.png)

- **完整模式**：关掉极简（❖）后回归 dsh web 原生界面，用于改 dsh 自身的配置。⚙ 设置面板只在极简模式出现，其文字**自动跟随 dsh 自身的语言**（中文/English）；语言本身在 dsh 的设置里改——切到完整模式即可看到侧边栏和设置：

  ![完整模式](imgs_for_show/Screenshot%20with%20Minimalist%20Mode%20Disabled.png)

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `pending (waiting for service: webServer)` | profile 缺 `@deepseek-ai/dsh-web-app`（见快速开始的 bundles 检查） |
| `electron binary not found` / `Electron failed to install correctly` | 依赖没装好，用上面的镜像命令重装 |
| 启动时多弹了一个浏览器标签页 | 检查 `cordis.patch.yml` 里 `web-runtime` 的 `openBrowser: false` |

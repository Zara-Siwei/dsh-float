# DeepSeek Float

一个 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) 的 bundle：把 dsh 的 Web 界面装进无边框半透明 Electron 窗口。**极简模式**下是悬浮在桌面上的「终端式」透明界面；**完整模式**则回归 dsh web 原生界面。关窗即退出整个运行时。

![浮动终端界面](imgs_for_show/Desktop%20Screenshot.png)

## 安装

前置条件：`dsh` 在 PATH 上、Node.js ≥ 18、`pnpm`、`git`。

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

`dsh plugin` 会转发给 profile 目录里的 pnpm，这一条命令就完成克隆、安装依赖（Electron）、注册 bundle。

然后打开 `~/.dsh/profiles/float/package.json`，确认 `dsh.profile.bundles` 为：

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

`dsh-float` 是建立在 `dsh-web-app` 之上的 surface bundle；`dsh plugin` 只会追加 `dsh-float`，所以 `dsh-web-app` 需要你手动补上。顺序不能乱。

## 运行

```powershell
dsh --profile float
```

Windows 下也可双击 `float.vbs` 无窗口启动。

## 界面与设置

- **极简模式**（默认）：侧栏、详情、头部收成右上角一个会呼吸的绿色光点，悬停展开按钮（❖ 极简/完整、⚙ 设置、↑ 置顶、– □ ✕）。
- **⚙ 外观设置**：文字颜色、背景颜色与透明度、文字阴影，自动记忆。

  ![外观设置](imgs_for_show/Appearance%20Settings.png)

- **完整模式**：关掉极简（❖）回归 dsh web 原生界面，dsh 自身的配置都在这里改。⚙ 设置面板只在极简模式出现，其文字**自动跟随 dsh 自身的语言**（中文 / English）；语言在切到完整模式后的 dsh 设置里改。

  ![完整模式](imgs_for_show/Screenshot%20with%20Minimalist%20Mode%20Disabled.png)

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `pending (waiting for service: webServer)` | profile 缺 `@deepseek-ai/dsh-web-app`（见安装）。 |
| `electron binary not found` / `Electron failed to install correctly` | 重新安装依赖。 |
| 启动时多弹了浏览器标签页 | 确认 `cordis.patch.yml` 里 `web-runtime` 的 `openBrowser: false`。 |

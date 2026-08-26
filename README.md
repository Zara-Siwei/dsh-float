# DeepSeek Float — 让 `dsh --profile float` 可运行

> 本文件写给**拿到这个插件目录、没有任何上下文的新 agent（或新人）**。
> 按第 3 节的顺序执行，就能让 `dsh --profile float` 跑起来。读完本文件即可独立完成：装依赖 → 配 profile → 验证 → 运行。

## 0. 快速开始（从 GitHub 获取）

下文用 `<plugin-dir>` 指代你克隆/存放本插件的**绝对路径**（如 `D:\projects\dsh-float`），照抄命令时请替换成实际路径。

1. 获取代码：

   ```powershell
   git clone https://github.com/Zara-Siwei/dsh-float.git
   cd dsh-float
   ```

2. 装插件依赖（electron）：

   ```powershell
   pnpm install
   ```

3. 注册 profile 并挂入插件：

   ```powershell
   dsh plugin --profile float add link:<plugin-dir>
   ```

4. 打开 `~/.dsh/profiles/float/package.json`，确认 `dsh.profile.bundles` 为（顺序不能乱）：

   ```json
   ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
   ```

5. 启动：

   ```powershell
   dsh --profile float
   ```

   Windows 下也可直接双击 `float.vbs`（无窗口直接弹界面）。

> 每一步的细节、原理和故障排查见下面第 1–7 节。

## 1. 这是什么

一个**外部、自包含**的 dsh 插件：用无边框半透明 Electron 窗口加载 dsh 的 Web UI（真实 SPA，不是套壳），关掉窗口就退出整个 dsh 运行时。

| 文件 | 作用 |
| --- | --- |
| `package.json` | 插件清单。`dsh.bundle.patch` 声明它是个 **bundle**（profile 的补丁层）；`electron` 是运行时依赖 |
| `cordis.patch.yml` | bundle 补丁层：把 web server 绑到 `127.0.0.1:0`（随机端口，不跟 `dsh web` 的 3080 冲突）、禁止默认打开浏览器、插入 `float-runner` 行 |
| `lib/index.js` | `float-runner` 插件本体：`inject: ['webServer']`，拿到端口后 spawn Electron，窗口关闭时销毁整个插件树 |
| `float.bat` | Windows 一键启动：隐藏控制台运行 `dsh --profile float`；会短暂闪一个窗口，出错时能在控制台看到报错 |
| `float.vbs` | Windows 一键启动（推荐）：用 `wscript` 完全隐藏、无窗口无闪，只弹悬浮 Electron 窗口 |
| `shell/` | Electron 壳：`main.js`（读 `DSH_FLOAT_URL` 加载 SPA、注入 `skin.css`）、`preload.js`、`skin.css`、`icon.png` |
| `node_modules/` | 生成物（electron 等），不在版本控制里 |

**最关键的设计依赖**（不理解它就会踩第 5 节的坑）：

- `float-runner` 声明 `inject: ['webServer']`，必须等 `webServer` 服务就绪才能激活。
- `webServer` 服务由 `@deepseek-ai/dsh-host-webserver` 提供，而这个插件**只在 `@deepseek-ai/dsh-web-app` bundle 的组合里才会被挂载**。
- 所以 profile 必须组合 **`dsh-base` + `dsh-web-app` + `dsh-float`**，顺序不能乱（float 的 patch 要应用在 web-app 之后，才能覆盖 `webserver`/`web-runtime` 的配置）。

## 2. 前置条件

- `dsh` 已安装且在 PATH 上（标准安装都自带 `dsh-web-app` bundle）。确认：`Get-Command dsh`。
- `node` ≥ 18 和 `pnpm` 可用。
- 系统有图形环境（Electron 窗口需要）。Linux 下无头环境需要 X11/Wayland。

## 3. 让它可运行的步骤（按顺序执行）

### 3.1 安装插件自己的依赖（electron）

`dsh plugin ... add link:<本目录>` 用的是 pnpm 的 `link:` 语义——**被链接包的依赖不会被自动安装**，所以必须在这个目录里自己装一次：

```powershell
cd <plugin-dir>
pnpm install
```

验证 electron 的**二进制**真的在（npm 包装上 ≠ 二进制下载成功）：

```powershell
node -e "const fs=require('fs');const p=require('<plugin-dir>/node_modules/electron');console.log(p, fs.existsSync(p))"
```

期望输出：一个以 `electron.exe` 结尾的路径 + `true`。

> **如果 `pnpm install` 时二进制下载失败**（`TypeError: fetch failed` / `Electron failed to install correctly`，常见于国内网络访问 GitHub 失败），用 npmmirror 镜像重跑安装脚本：
>
> ```powershell
> $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
> node node_modules/electron/install.js
> ```

### 3.2 注册 profile（若 profile 已存在可跳过）

```powershell
dsh plugin --profile float add link:<plugin-dir>
```

`dsh plugin` 首次使用会初始化 profile（`~/.dsh/profiles/float`，取决于 `DSH_HOME`）。**注意：非模板 profile 初始化时只组合 `@deepseek-ai/dsh-base`**，`dsh-float` 是 add 之后由 reconcile 逻辑追加的。

### 3.3 【关键】确认 profile 组合了 `dsh-web-app`

这是最容易漏、漏了必报错的一步。打开 `~/.dsh/profiles/float/package.json`，`dsh.profile.bundles` 必须恰好是下面这样（`dsh-web-app` 在 `dsh-float` **之前**）：

```json
{
  "name": "dsh-profile-float",
  "private": true,
  "dependencies": {
    "@zaralinux/dsh-float": "link:<plugin-dir>"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@zaralinux/dsh-float"
      ]
    }
  }
}
```

- 缺 `@deepseek-ai/dsh-web-app` → 没有 `webServer` 服务 → `float-runner` 永远 pending → 启动报 `pending (waiting for service: webServer)`（见 5.1）。
- 顺序反了（float 在 web-app 之前）→ float 的 patch 覆盖不到 `webserver`/`web-runtime` 行，随机端口和 `openBrowser: false` 都会失效。
- `dsh-web-app` 是 in-box bundle，走安装目录的 fallback 解析，**不需要**加进 `dependencies`。

### 3.4 验证组合树（不启动，纯静态检查）

```powershell
dsh --profile float --dump-config
```

确认输出里包含：

```yaml
- id: webserver
  name: '@deepseek-ai/dsh-host-webserver'
  config:
    host: 127.0.0.1
    port: 0
- id: web-runtime
  name: '@deepseek-ai/dsh-web-app'
  config:
    openBrowser: false
- id: float-runner
  name: '@zaralinux/dsh-float'
```

### 3.5 运行

```powershell
dsh --profile float
```

- 会弹出一个 1440×900 无边框半透明 Electron 窗口，加载 `http://127.0.0.1:<随机端口>/` 上的 Web UI。
- 进程在窗口打开期间保持存活；**关闭窗口 = 整个 dsh 运行时退出**（`float-runner` 会 dispose 整棵树后退出进程）。
- 不会打开浏览器标签页（`openBrowser: false` 已在补丁里）。
- 右上角按钮：❖ 切换极简/完整，⚙ 设置（仅极简模式：文字颜色、背景、透明度、阴影，自动记忆），↑ 置顶，– 最小化，□ 最大化，✕ 关闭。

### 3.6 一键启动（可选）

不想开终端的话，双击插件目录里的 **`float.vbs`** 即可——它用 Windows 自带的 `wscript` 在**完全隐藏**的会话里跑 `dsh --profile float`，**无窗口、无闪**，桌面上只出现悬浮 Electron 窗口，关闭窗口整个运行时退出。

- 命令行方式仍是 `dsh --profile float`；`float.vbs` 只是它的"隐藏终端"包装，依赖 PATH 上的 `dsh`，无需 `powershell`。
- 旁边保留的 `float.bat` 作用相同，但会短暂闪一个控制台窗口——**留着是因为出错时能在控制台看到 dsh 的报错**（`float.vbs` 静默失败看不到原因）。平时用 `.vbs`，排查问题时用 `.bat`。

## 4. 启动时发生了什么（服务依赖链）

```
profile-boot 提供 cmdlineArgs
   → web-startup        (提供 webStartup，解析 --host/--port/--no-open 等内层参数)
      → webserver       (提供 webServer；float 补丁把配置改成 127.0.0.1:0 → 绑定随机端口)
         → float-runner (inject webServer，读 .port 拼 URL，spawn Electron)
         → web-runtime  (同一时刻挂载，打印 URL 行、注册 /api 传输和静态资源)
```

端口用 `0` 的意义：让操作系统分配空闲端口，任何时刻都不会跟正在跑的 `dsh web`（3080）撞车。

## 5. 故障排查

### 5.1 `pending (waiting for service: webServer)` / `1 entry did not activate`

```
Error: dsh: plugin tree failed to load: dsh: 1 entry did not activate
@zaralinux/dsh-float: pending (waiting for service: webServer)
```

原因：profile 缺 `@deepseek-ai/dsh-web-app` bundle，`webServer` 服务不存在。**执行 3.3** 后重跑。

### 5.2 electron 相关报错

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `@zaralinux/dsh-float: electron binary not found (...) — reinstall the plugin... or set DSH_FLOAT_ELECTRON` | 插件目录没装依赖（`link:` 不装子依赖） | 执行 3.1 |
| `Electron failed to install correctly` / `TypeError: fetch failed` | npm 包装上了，但二进制没从 GitHub 下载成功 | 用 3.1 的 `ELECTRON_MIRROR` 镜像重跑 |
| 二进制存在但想换一个 | 不想用插件自带的 electron | `$env:DSH_FLOAT_ELECTRON='C:\path\to\electron.exe'; dsh --profile float` |

### 5.3 启动时多弹了一个浏览器标签页

旧版 `cordis.patch.yml` 没有 `web-runtime` 的 `openBrowser: false` 覆盖。补上（见 `cordis.patch.yml` 现状），或运行时加 `dsh --profile float --no-open`。

### 5.4 其它

- `dsh: pnpm not found on PATH` → 先装 pnpm。
- 端口/绑定想改 → 改 `cordis.patch.yml` 里 `webserver` 的 `host`/`port`，改完无需重装。

## 6. 调试钩子（`shell/main.js` 内置，按需使用）

| 环境变量 | 作用 |
| --- | --- |
| `DSH_FLOAT_URL` | 被 `float-runner` 注入的 URL，一般不要手动设 |
| `DSH_FLOAT_ELECTRON` | 指定 electron 二进制路径（替代插件自带的） |
| `DSH_FLOAT_DUMP_DOM=<路径>` | 页面加载后 dump DOM 树 + 主题 token + 截图，然后自动退出 |
| `DSH_FLOAT_TEST_SEND="文本"` | 向 SPA 输入框注入文本并发送，随后 dump 聊天节点 + 截图，自动退出 |

## 7. 注意事项 / 可改进点

- `node_modules/`、`pnpm-lock.yaml` 是生成物。这个目录目前不在 git 下；若以后入库，`.gitignore` 至少加 `node_modules/`。
- 安装 electron 的麻烦源自 `link:` 语义。发布成 tarball（`pnpm pack`）或 registry 包后，`dsh plugin add <tarball>` 会由 pnpm 自动装好依赖，真正"拿来即用"。
- electron 版本由 `package.json` 的 `electron: ^43.4.0` 锁定（当前装到 43.4.1）。

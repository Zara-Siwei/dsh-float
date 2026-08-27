# DeepSeek Float

[English](#english) · [中文](#chinese)

![Floating terminal UI](imgs_for_show/Desktop%20Screenshot.png)

## English

A dsh bundle that runs the DeepSeek Harness Web UI in a borderless translucent Electron window — a floating, terminal-style overlay in minimal mode.

**Install & run**

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

Then set `~/.dsh/profiles/float/package.json` → `dsh.profile.bundles` to:

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

```powershell
dsh --profile float
```

Prerequisites: `dsh` on PATH, Node ≥ 18, `pnpm`, `git`. The ⚙ settings (minimal mode only) follow dsh's own language.

## 中文

一个 dsh bundle：把 DeepSeek Harness 的 Web 界面装进无边框半透明 Electron 窗口，极简模式下是悬浮的「终端式」透明界面。

**安装与运行**

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

然后把 `~/.dsh/profiles/float/package.json` 的 `dsh.profile.bundles` 设为：

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

```powershell
dsh --profile float
```

前置条件：`dsh` 在 PATH、Node ≥ 18、`pnpm`、`git`。⚙ 设置（仅极简模式）文字跟随 dsh 自身语言。

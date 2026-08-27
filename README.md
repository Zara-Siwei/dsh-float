# DeepSeek Float

A [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) bundle that runs the dsh Web UI inside a borderless, translucent Electron window. In **minimal mode** it becomes a floating, terminal-style overlay on your desktop; in **full mode** it returns to the stock dsh web interface. Closing the window exits the whole runtime.

![Floating terminal UI](imgs_for_show/Desktop%20Screenshot.png)

## Install

Prerequisites: the `dsh` CLI on your `PATH`, Node.js ≥ 18, `pnpm`, and `git`.

```powershell
dsh plugin --profile float add github:Zara-Siwei/dsh-float
```

`dsh plugin` forwards to pnpm in the profile directory, so this one command clones the plugin, installs its dependencies (Electron), and registers the bundle.

Then open `~/.dsh/profiles/float/package.json` and make sure `dsh.profile.bundles` is:

```json
["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@zaralinux/dsh-float"]
```

`dsh-float` is a surface bundle on top of `dsh-web-app`; `dsh plugin` only appends `dsh-float`, so add `dsh-web-app` yourself. Order matters.

## Run

```powershell
dsh --profile float
```

On Windows you can also double-click `float.vbs` for a windowless launch.

## UI & settings

- **Minimal mode** (default): the sidebar, details and header collapse into a breathing green dot in the top-right; hover it to expand the controls (❖ minimal/full, ⚙ settings, ↑ always-on-top, – □ ✕).
- **⚙ Appearance settings**: text colors, background color & opacity, and text shadow — persisted automatically.

  ![Appearance settings](imgs_for_show/Appearance%20Settings.png)

- **Full mode**: turn off minimal mode (❖) to get the stock dsh web UI, where dsh's own configuration lives. The ⚙ panel exists only in minimal mode, and its labels **follow dsh's own language** (中文 / English); change the language in dsh's settings after switching to full mode.

  ![Full mode](imgs_for_show/Screenshot%20with%20Minimalist%20Mode%20Disabled.png)

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `pending (waiting for service: webServer)` | The profile is missing `@deepseek-ai/dsh-web-app` (see Install). |
| `electron binary not found` / `Electron failed to install correctly` | Reinstall the dependency. |
| A browser tab opens on startup | Ensure `web-runtime` has `openBrowser: false` in `cordis.patch.yml`. |

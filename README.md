# Mailspring Inbox Assist

A Mailspring plugin that adds an unread / starred thread filter and AI email summaries
(cloud, mainland-China or local OpenAI-compatible models).
All controls are registered to `*.Toolbar` locations, so Mailspring renders them inside each column's `div.item-container`.

## Features

### Thread list toolbar
- **Filter dropdown** (with icons, themed): `All mail` / `Unread only` / `Starred only`.
  Applies to folders, labels and search results. While a filter is on, the dropdown is highlighted.
  With *Unread only*, a thread drops out of the list once you open it (it becomes read), same as Gmail.

### Message toolbar
- **✨ Summarize**: summarizes the open thread with any OpenAI-compatible `/chat/completions` endpoint and shows
  the result in a popover (Copy / Retry / Close, Esc closes). Markdown and simple HTML in the reply are rendered.
- **Right-click a thread** in the list → **✨ Summarize with AI**: same summary without opening the email.

## AI setup

Preferences → **Inbox Assist**:

| Provider | Base URL | Key |
|---|---|---|
| Ollama (local, default) | `http://localhost:11434/v1` | not needed |
| LM Studio (local) | `http://localhost:1234/v1` | not needed |
| OpenAI / OpenRouter | preset | required |
| DeepSeek / Qwen (DashScope) / Moonshot / Zhipu | preset | required |
| Custom | anything OpenAI-compatible | optional |

- The API key is stored in the OS keychain (Mailspring `KeyManager`), not in `config.json`.
- **Test connection** sends a one-word prompt to verify the URL, model and key.
- The system prompt is editable (e.g. "always answer in Traditional Chinese").
- Long threads are cut to the last *N* characters (default 12000).
- Email content is sent to whatever endpoint you configure. Use a local model for private mail.

## Build & install

```
npm install
npm run build
```

Then in Mailspring: **Developer → Install a Plugin…** and pick this folder,
or copy/link the folder into `%APPDATA%\Mailspring\packages\`. Restart Mailspring
(or Developer → Reload) after each rebuild.

Shortcut for developers: create a link to your project folder under Mailspring plugin folder. To reload, go to Developer -> Reload.

## Layout

```
src/main.ts                    activate/deactivate, registers everything
src/thread-filters-feature.ts  wraps perspective.threads() to apply the unread / starred filter
src/thread-list-refresh.ts     re-runs the thread list query when the filter changes
src/filter-select.tsx          All / Unread / Starred dropdown (ButtonDropdown + Menu)
src/preferences-tab.tsx        Preferences → Inbox Assist
src/ai/                        providers, OpenAI-compatible client, summarize + popover
styles/inbox-assist.less       auto-loaded by Mailspring
```

## Acknowledgements

Mailspring Inbox Assist is an independent project, not a fork.

- Inspired by [alexey-anufriev/mailspring-toolbox](https://github.com/alexey-anufriev/mailspring-toolbox),
  whose TypeScript + webpack build setup this project follows.
- Built for [Mailspring](https://github.com/Foundry376/Mailspring) using its plugin APIs.
- Developed with the help of Claude (Anthropic) as a coding assistant. All code has been reviewed and is maintained by the author. 

## License

[MIT](LICENSE)

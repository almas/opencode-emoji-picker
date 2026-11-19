# opencode-emoji-picker

An emoji picker for **OpenCode Desktop**: a smiley button appears right beside the composer's send button, and one click opens a compact popup with search, category tabs, favorites, recents and skin tones. Everything is local — the dataset is embedded in the plugin, so it works fully offline.

日本語は[下のセクション](#日本語)にあります。

## Features

- **One click from the composer** — a ghost-icon smiley is injected next to the send button (same host styling, so it matches any theme). Click again, press `Esc`, or click outside to close.
- **Search** — type English names or keywords (`octopus`, `red car`, `thumbs up`), or paste an emoji to find it. Enter picks the first match.
- **Category tabs** — Smileys, Animals & Nature, Food, Activity, Travel, Objects, Symbols, Flags (about 1,900 emoji, Unicode 15).
- **★ Favorites** — right-click any emoji to pin it; pinned items live in the first tab and persist across restarts.
- **🕘 Recents** — whatever you insert is pushed to the front of the recents tab automatically.
- **Skin tones** — six swatches in the popup header set the tone for hand/person emoji; the choice is remembered.
- **Persistent prefs** — favorites, recents and skin tone are stored server-side (`ctx.storage`) and shared across windows.

## Install

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    { "package": "github:almas/opencode-emoji-picker" }
    // or: "/absolute/path/to/opencode-emoji-picker"
  ]
}
```

Reload the window and open any session — the smiley shows up beside the send button.

## Usage

1. Click the smiley next to **Send**.
2. Browse tabs, search, or hit `★`/`🕘`. **Click** inserts at the caret; **right-click** toggles a favorite.
3. Pick a skin tone with the 👍 swatches; it is remembered.

## Development

```bash
npm install
npm test        # vitest: prefs + search
npm run typecheck
npm run build   # dist/gui-experimental.cjs via @opencode/plugin/gui/vite
```

The emoji dataset (`src/data.ts`) is generated from [@emoji-mart/data](https://github.com/missive/emoji-mart) (MIT, Emoji Mart) — Unicode 15 native emoji embedded as TypeScript so the popup needs no network at all.

## License

MIT

---

## 日本語

OpenCode Desktop に絵文字ピッカーを追加するプラグインです。送信ボタンの左にスマイリーアイコンが出て、クリックすると検索・カテゴリタブ・お気に入り・最近使った・肌色対応のポップアップが開きます。データはプラグイン内に埋め込み済みで、完全にオフラインで動きます。

### 機能

- **送信ボタン横のワンクリック** — ホストと同じスタイルのアイコンが挿入され、テーマに自然に馴染みます。もう一度クリック / `Esc` / 外側クリックで閉じます
- **検索** — 英語名・キーワード（`octopus`、`red car` など）、絵文字の貼り付け検索も可。Enter で最初の候補を挿入
- **カテゴリタブ** — 顔・人 / 自然 / 食べ物 / 活動 / 場所 / 物 / 記号 / 旗（Unicode 15、約 1,900 種）
- **★ お気に入り** — 絵文字を右クリックでピン留め。再起動後も保持されます
- **🕘 最近使った** — 挿入した絵文字は自動で先頭に並びます
- **肌色** — ヘッダーの 👍 スウォッチで 6 段階を選択、選択は記憶されます
- **設定の永続化** — お気に入り・履歴・肌色はサーバー側（`ctx.storage`）に保存され、ウィンドウ間で共有されます

### インストール

上の [Install](#install) の JSONC を `~/.config/opencode/opencode.jsonc` に追記し、ウィンドウを再読み込みしてください。

### データ出典

絵文字データ（`src/data.ts`）は [@emoji-mart/data](https://github.com/missive/emoji-mart)（Emoji Mart、MIT）から生成しています。

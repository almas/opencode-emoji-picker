/**
 * Emoji Picker — GUI half.
 *
 * Injects a smiley button right beside the composer's submit button (same
 * host classes, so every theme styles it), and opens an anchored popup:
 * search, category tabs, favorites and recents, skin tones. Picking an emoji
 * inserts it at the composer caret; favorites/recents/skin persist through
 * the server half (ctx.storage) over the shared RPC contract.
 */
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { Portal } from "solid-js/web"
import { Plugin, Slot } from "@opencode/plugin/gui"
import { CATEGORIES, EMOJIS } from "./data"
import { charFor, onlyKnown, searchIds } from "./filter"
import { DEFAULT_PREFS, pushRecent, toggleId } from "./prefs"
import { EmojiPickerRpc, type EmojiPrefs } from "./rpc"

const ANCHOR_SELECTOR = 'button[data-oc-emoji-picker="1"]'
const SUBMIT_SELECTOR = 'button[data-action="composer-submit"]'
const POP_ATTR = "data-oc-emoji-pop"
const POP_WIDTH = 360

const SMILEY_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>'

/** The RPC surface we call, typed by hand the way the schema proxy behaves. */
interface RpcLike {
  prefs(input: Record<string, never>): Promise<EmojiPrefs>
  setPrefs(input: Partial<EmojiPrefs>): Promise<EmojiPrefs>
}

/** RPC with retries: on window load the server half may not answer yet. */
async function retryRpc<T>(call: () => Promise<T>, attempts = 8, delayMs = 500): Promise<T | undefined> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await call()
    } catch {
      if (i + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return undefined
}

const CATEGORY_LABELS_JA: Record<string, string> = {
  people: "顔・人",
  nature: "自然",
  foods: "食べ物",
  activity: "活動",
  places: "場所",
  objects: "物",
  symbols: "記号",
  flags: "旗",
}

const STYLE = `
@keyframes emj-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
[data-oc-emoji-picker="1"] {
  background: transparent !important;
  border-color: transparent !important;
  color: inherit;
  opacity: 0.75;
  margin-inline-end: 2px;
  flex-shrink: 0;
}
[data-oc-emoji-picker="1"]:hover { opacity: 1; background: color-mix(in oklab, currentColor 12%, transparent) !important; }
[data-oc-emoji-picker="1"][data-open="1"] { opacity: 1; background: color-mix(in oklab, currentColor 14%, transparent) !important; }
[data-oc-emoji-pop] {
  position: fixed; z-index: 2147483000; width: ${POP_WIDTH}px; max-width: calc(100vw - 16px);
  display: flex; flex-direction: column;
  border-radius: 10px; border: 1px solid var(--v2-border-border-base, #3a3a3f);
  background: var(--v2-background-bg-layer-02, #232326);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  font-size: 13px; user-select: none; overflow: hidden;
  animation: emj-in 120ms ease-out;
}
[data-oc-emoji-pop] input { user-select: text; }
.emj-head { display: flex; align-items: center; gap: 6px; padding: 8px 8px 6px; }
.emj-search {
  flex: 1; min-width: 0; height: 26px; padding: 0 8px;
  border-radius: 6px; border: 1px solid var(--v2-border-border-base, #3a3a3f);
  background: var(--v2-background-bg-layer-01, #1b1b1e);
  color: var(--v2-text-text-primary, #eeeeee); outline: none; font-size: 13px;
}
.emj-search:focus { border-color: var(--v2-border-border-selected, #6b9fff); }
.emj-skins { display: flex; gap: 1px; align-items: center; }
.emj-skin {
  width: 22px; height: 22px; border-radius: 50%; border: 1px solid transparent;
  background: transparent; cursor: pointer; font-size: 13px; line-height: 1;
  display: flex; align-items: center; justify-content: center; padding: 0;
}
.emj-skin[aria-pressed="true"] {
  border-color: var(--v2-border-border-selected, #6b9fff);
  background: color-mix(in oklab, var(--v2-border-border-selected, #6b9fff) 14%, transparent);
}
.emj-x {
  width: 22px; height: 22px; border-radius: 6px; border: 0; background: transparent;
  color: var(--v2-text-text-muted, #9a9aa2); cursor: pointer; font-size: 13px; line-height: 1;
}
.emj-x:hover { background: color-mix(in oklab, currentColor 10%, transparent); color: inherit; }
.emj-tabs {
  display: flex; gap: 1px; padding: 0 6px 6px; overflow-x: auto; scrollbar-width: none;
  border-bottom: 1px solid var(--v2-border-border-base, #3a3a3f);
}
.emj-tab {
  flex: 0 0 auto; min-width: 28px; height: 26px; border: 0; border-radius: 6px;
  background: transparent; cursor: pointer; font-size: 15px; line-height: 1; padding: 0 2px;
  display: flex; align-items: center; justify-content: center;
  color: var(--v2-text-text-muted, #9a9aa2);
}
.emj-tab:hover { background: color-mix(in oklab, currentColor 10%, transparent); }
.emj-tab[aria-selected="true"] {
  background: color-mix(in oklab, var(--v2-border-border-selected, #6b9fff) 16%, transparent);
}
.emj-grid {
  height: 248px; overflow-y: auto; padding: 6px;
  display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; align-content: start;
}
.emj-cell {
  aspect-ratio: 1; border: 0; border-radius: 6px; background: transparent;
  font-size: 20px; line-height: 1; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.emj-cell:hover { background: color-mix(in oklab, currentColor 10%, transparent); }
.emj-cell[data-pinned="1"] { box-shadow: inset 0 0 0 1px var(--v2-border-border-selected, #6b9fff); }
.emj-empty {
  grid-column: 1 / -1; padding: 26px 12px; text-align: center;
  color: var(--v2-text-text-muted, #9a9aa2); font-size: 12px;
}
.emj-foot {
  padding: 4px 10px 6px; min-height: 20px;
  color: var(--v2-text-text-muted, #9a9aa2); font-size: 11px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
`

export default Plugin.define({
  i18n: {
    en: {
      "emoji-picker.name": "Emoji Picker",
      "emoji-picker.button": "Emoji",
      "emoji-picker.search": "Search emoji",
      "emoji-picker.pinned": "Favorites",
      "emoji-picker.recent": "Recent",
      "emoji-picker.close": "Close",
      "emoji-picker.skin": "Skin tone",
      "emoji-picker.empty.pinned": "Right-click an emoji to pin it here",
      "emoji-picker.empty.recent": "Nothing yet — pick an emoji and it shows up here",
      "emoji-picker.empty.search": "No matches",
      "emoji-picker.hint": "Click to insert · right-click to pin",
      "emoji-picker.no-session": "Open a session to insert emoji into",
    },
    ja: {
      "emoji-picker.name": "絵文字ピッカー",
      "emoji-picker.button": "絵文字",
      "emoji-picker.search": "絵文字を検索",
      "emoji-picker.pinned": "お気に入り",
      "emoji-picker.recent": "最近使った",
      "emoji-picker.close": "閉じる",
      "emoji-picker.skin": "肌の色",
      "emoji-picker.empty.pinned": "右クリックでお気に入りに追加できます",
      "emoji-picker.empty.recent": "まだありません — 絵文字を選ぶとここに出ます",
      "emoji-picker.empty.search": "該当なし",
      "emoji-picker.hint": "クリックで挿入 ・ 右クリックでお気に入り",
      "emoji-picker.no-session": "挿入先のセッションを開いてください",
    },
  },
  setup(ctx) {
    const rpc = ctx.client.rpc(EmojiPickerRpc) as unknown as RpcLike
    const isJa = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ja")

    const [prefs, setPrefs] = createSignal<EmojiPrefs>({ ...DEFAULT_PREFS })
    const [open, setOpen] = createSignal(false)
    const [rect, setRect] = createSignal({ left: 8, bottom: 8 })
    const [tab, setTab] = createSignal("people")
    const [query, setQuery] = createSignal("")
    const [foot, setFoot] = createSignal(ctx.t("emoji-picker.hint"))

    // ---------- preferences over RPC ----------
    void retryRpc(() => rpc.prefs({})).then((value) => {
      if (value) setPrefs({ ...DEFAULT_PREFS, ...value })
    })

    let saveTimer: ReturnType<typeof setTimeout> | undefined
    const savePrefs = (next: EmojiPrefs) => {
      setPrefs(next)
      if (saveTimer !== undefined) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        saveTimer = undefined
        void rpc.setPrefs(next).catch(() => undefined)
      }, 250)
    }
    onCleanup(() => {
      if (saveTimer !== undefined) clearTimeout(saveTimer)
    })

    // ---------- popup geometry ----------
    const positionPopup = () => {
      const anchor = document.querySelector<HTMLElement>(ANCHOR_SELECTOR)
      if (!anchor) return
      const box = anchor.getBoundingClientRect()
      const left = Math.max(8, Math.min(box.right - POP_WIDTH, window.innerWidth - POP_WIDTH - 8))
      const bottom = Math.max(8, window.innerHeight - box.top + 8)
      setRect({ left, bottom })
    }
    const toggle = () => {
      if (open()) {
        setOpen(false)
        return
      }
      positionPopup()
      setQuery("")
      setFoot(ctx.t("emoji-picker.hint"))
      setOpen(true)
    }
    const reposition = () => {
      if (open()) positionPopup()
    }
    const onDocPointer = (event: PointerEvent) => {
      if (!open()) return
      const target = event.target as Element | null
      if (target?.closest?.(`[${POP_ATTR}], ${ANCHOR_SELECTOR}`)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open()) setOpen(false)
    }
    document.addEventListener("pointerdown", onDocPointer, true)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", reposition)
    window.addEventListener("scroll", reposition, true)
    onCleanup(() => {
      document.removeEventListener("pointerdown", onDocPointer, true)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
    })

    // ---------- composer control: a smiley beside send ----------
    // Host-styled injection proven by the voice plugins: copy the submit
    // button's classes, prune duplicates, and let a ghost-icon style override
    // the accent submit variant.
    const styleSheet = document.createElement("style")
    styleSheet.textContent = STYLE
    document.head.append(styleSheet)
    onCleanup(() => styleSheet.remove())

    const syncButton = () => {
      const found = Array.from(document.querySelectorAll<HTMLElement>(SUBMIT_SELECTOR))
      const submits = found.filter((el) => !found.some((other) => other !== el && el.contains(other)))

      const footers = new Map<HTMLElement, HTMLElement>()
      for (const submit of submits) {
        const footer = submit.parentElement
        if (footer && !footers.has(footer)) footers.set(footer, submit)
      }

      // Prune smileys whose footer lost its submit button, and extras.
      const kept = new Set<HTMLElement>()
      for (const smiley of Array.from(document.querySelectorAll<HTMLButtonElement>(ANCHOR_SELECTOR))) {
        const host = smiley.parentElement
        if (!host || !footers.has(host) || kept.has(host)) {
          smiley.remove()
          continue
        }
        kept.add(host)
      }

      for (const [footer, submit] of footers) {
        if (kept.has(footer)) continue
        const button = document.createElement("button")
        button.type = "button"
        button.setAttribute("data-oc-emoji-picker", "1")
        button.setAttribute("title", ctx.t("emoji-picker.button"))
        button.setAttribute("aria-label", ctx.t("emoji-picker.button"))
        for (const cls of submit.classList) button.classList.add(cls)
        button.style.setProperty("position", "relative")
        button.style.setProperty("z-index", "1")
        button.innerHTML = SMILEY_SVG
        button.addEventListener("click", (event) => {
          event.preventDefault()
          event.stopPropagation()
          toggle()
        })
        footer.insertBefore(button, submit)
      }
    }

    const paintButtons = () => {
      const state = open() ? "1" : "0"
      for (const smiley of Array.from(document.querySelectorAll<HTMLButtonElement>(ANCHOR_SELECTOR))) {
        if (smiley.dataset.open !== state) smiley.dataset.open = state
      }
    }
    createEffect(paintButtons)

    let pendingSync = false
    const observer = new MutationObserver(() => {
      if (pendingSync) return
      pendingSync = true
      queueMicrotask(() => {
        pendingSync = false
        syncButton()
        paintButtons()
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const resync = setInterval(() => {
      syncButton()
      paintButtons()
    }, 2500)
    onMount(() => {
      syncButton()
      paintButtons()
    })
    onCleanup(() => {
      observer.disconnect()
      clearInterval(resync)
      document.querySelectorAll(ANCHOR_SELECTOR).forEach((el) => el.remove())
    })

    // ---------- popup content ----------
    const ids = createMemo<string[]>(() => {
      const q = query().trim()
      if (q) return searchIds(q)
      if (tab() === "pinned") return onlyKnown(prefs().pinned)
      if (tab() === "recent") return onlyKnown(prefs().recent)
      return CATEGORIES.find((c) => c.id === tab())?.ids ?? []
    })

    let gridEl: HTMLDivElement | undefined
    createEffect(() => {
      tab()
      query()
      if (gridEl) gridEl.scrollTop = 0
    })

    const insert = (id: string) => {
      const char = charFor(id, prefs().skin)
      if (!char) return
      const screen = ctx.screen.current()
      if (!screen) {
        ctx.toast.show({ title: ctx.t("emoji-picker.name"), description: ctx.t("emoji-picker.no-session"), variant: "error" })
        return
      }
      screen.composer.insert(char)
      savePrefs({ ...prefs(), recent: pushRecent(prefs().recent, id) })
    }

    const togglePin = (id: string) => {
      savePrefs({ ...prefs(), pinned: toggleId(prefs().pinned, id) })
    }

    const tooltip = (id: string) => {
      const entry = EMOJIS[id]
      return entry ? `${entry.n} :${id}:` : id
    }

    const skins = [0, 1, 2, 3, 4, 5]
    const skinChar = (tone: number) => charFor("+1", tone) ?? "👍"

    const Popup = () => (
      <Portal mount={document.body}>
        <Show when={open()}>
          <div data-oc-emoji-pop="1" style={{ left: `${rect().left}px`, bottom: `${rect().bottom}px` }}>
          <div class="emj-head">
            <input
              class="emj-search"
              type="text"
              placeholder={ctx.t("emoji-picker.search")}
              value={query()}
              ref={(el) => {
                requestAnimationFrame(() => el.focus())
              }}
              onInput={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const first = ids()[0]
                  if (first) insert(first)
                }
              }}
            />
            <div class="emj-skins" title={ctx.t("emoji-picker.skin")}>
              <For each={skins}>
                {(tone) => (
                  <button
                    type="button"
                    class="emj-skin"
                    aria-pressed={prefs().skin === tone}
                    title={`${ctx.t("emoji-picker.skin")} ${tone}`}
                    onClick={() => savePrefs({ ...prefs(), skin: tone })}
                  >
                    {skinChar(tone)}
                  </button>
                )}
              </For>
            </div>
            <button type="button" class="emj-x" title={ctx.t("emoji-picker.close")} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div class="emj-tabs">
            <button
              type="button"
              class="emj-tab"
              aria-selected={tab() === "pinned"}
              title={ctx.t("emoji-picker.pinned")}
              onClick={() => {
                setTab("pinned")
                setQuery("")
              }}
            >
              ★
            </button>
            <button
              type="button"
              class="emj-tab"
              aria-selected={tab() === "recent"}
              title={ctx.t("emoji-picker.recent")}
              onClick={() => {
                setTab("recent")
                setQuery("")
              }}
            >
              🕘
            </button>
            <For each={CATEGORIES}>
              {(cat) => (
                <button
                  type="button"
                  class="emj-tab"
                  aria-selected={tab() === cat.id}
                  title={isJa ? CATEGORY_LABELS_JA[cat.id] ?? cat.name : cat.name}
                  onClick={() => {
                    setTab(cat.id)
                    setQuery("")
                  }}
                >
                  {cat.icon}
                </button>
              )}
            </For>
          </div>
          <div class="emj-grid" ref={(el) => (gridEl = el)}>
            <Show
              when={ids().length > 0}
              fallback={
                <div class="emj-empty">
                  {query()
                    ? ctx.t("emoji-picker.empty.search")
                    : tab() === "pinned"
                      ? ctx.t("emoji-picker.empty.pinned")
                      : ctx.t("emoji-picker.empty.recent")}
                </div>
              }
            >
              <For each={ids()}>
                {(id) => (
                  <button
                    type="button"
                    class="emj-cell"
                    title={tooltip(id)}
                    data-pinned={prefs().pinned.includes(id) ? "1" : undefined}
                    onClick={() => insert(id)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      togglePin(id)
                    }}
                    onMouseEnter={() => setFoot(tooltip(id))}
                  >
                    {charFor(id, prefs().skin) ?? ""}
                  </button>
                )}
              </For>
            </Show>
          </div>
          <div class="emj-foot">{foot()}</div>
        </div>
      </Show>
    </Portal>
    )

    ctx.add(Slot, {
      at: "window.bottom",
      render: () => <Popup />,
    })
  },
})

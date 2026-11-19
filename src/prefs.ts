/**
 * Preference helpers — pure functions shared by the server (validation
 * before storage) and tests. No runtime imports keep them cheap.
 */
import type { EmojiPrefs } from "./rpc"

/** How many recent ids we keep; older entries fall off the end. */
export const MAX_RECENT = 40
/** How many pinned ids we keep. */
export const MAX_PINNED = 120

export const DEFAULT_PREFS: EmojiPrefs = { recent: [], pinned: [], skin: 0 }

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []

/** Remove duplicates while keeping order. */
const dedupe = (ids: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** Clamp the skin tone into the supported range (0 = default + 5 modifiers). */
export const clampSkin = (value: unknown): number => {
  const n = typeof value === "number" ? Math.trunc(value) : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(5, n))
}

/** Coerce anything loaded from storage or RPC into a valid EmojiPrefs. */
export const normalizePrefs = (raw: unknown): EmojiPrefs => {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PREFS }
  const p = raw as Record<string, unknown>
  return {
    recent: dedupe(strings(p.recent)).slice(0, MAX_RECENT),
    pinned: dedupe(strings(p.pinned)).slice(0, MAX_PINNED),
    skin: clampSkin(p.skin),
  }
}

/** Merge a partial update over the current prefs and normalize the result. */
export const mergePrefs = (current: EmojiPrefs, patch: unknown): EmojiPrefs => {
  if (typeof patch !== "object" || patch === null) return { ...current }
  const p = patch as Record<string, unknown>
  return normalizePrefs({
    recent: "recent" in p ? p.recent : current.recent,
    pinned: "pinned" in p ? p.pinned : current.pinned,
    skin: "skin" in p ? p.skin : current.skin,
  })
}

/** Push `id` to the front of `list` (deduped, capped) — the "used it" path. */
export const pushRecent = (list: string[], id: string): string[] =>
  dedupe([id, ...list]).slice(0, MAX_RECENT)

/** Toggle `id` in `list` without touching anything else. */
export const toggleId = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [id, ...list].slice(0, MAX_PINNED)

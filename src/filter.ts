/**
 * Selection helpers — pure functions over the generated data module, shared
 * by the GUI and tests.
 */
import { EMOJIS, type EmojiEntry } from "./data"
import { pushRecent } from "./prefs"

/** Does the id exist in the dataset? Guards stored prefs against stale ids. */
export const known = (id: string): boolean => Object.hasOwn(EMOJIS, id)

/** Drop ids the dataset no longer knows (old prefs, hand-edited storage). */
export const onlyKnown = (ids: string[]): string[] => ids.filter(known)

/** Resolve the character for an id under a skin tone (0 = default). */
export const charFor = (id: string, skin: number): string | undefined => {
  const entry: EmojiEntry | undefined = EMOJIS[id]
  if (!entry) return undefined
  if (skin > 0) {
    // Variants may sit on the entry itself or under the generated `v_` key.
    const variants = entry.v ?? EMOJIS[`v_${id}`]?.v
    if (variants && variants.length >= skin) return variants[skin - 1]
  }
  return entry.e
}

const haystack = (id: string): string => {
  const entry = EMOJIS[id]
  if (!entry) return id
  return `${id} ${entry.n} ${entry.k}`.toLowerCase()
}
/**
 * Match emoji ids against a free-text query. Every whitespace-separated
 * token must appear in the id, name or keywords (all lower-cased). The emoji
 * character itself also matches, so pasting "🐙" finds the octopus.
 */
export const searchIds = (query: string, limit = 200): string[] => {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const scored: { id: string; score: number }[] = []
  for (const id of Object.keys(EMOJIS)) {
    // `v_` entries only carry skin-tone variants; never surface them directly.
    if (id.startsWith("v_")) continue
    const hay = `${haystack(id)} ${EMOJIS[id]?.e ?? ""}`
    let score = 0
    let ok = true
    for (const token of tokens) {
      const at = hay.indexOf(token)
      if (at < 0) {
        ok = false
        break
      }
      // Prefer prefix hits, then early hits; name beats keywords roughly by id length.
      score += at === 0 ? 2 : 1
    }
    if (ok) scored.push({ id, score: score - Math.min(id.length, 20) / 40 })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.id)
}

/** The "used an emoji" update: recents bump, everything else is kept. */
export const usedEmoji = (recent: string[], id: string): string[] => pushRecent(recent, id)

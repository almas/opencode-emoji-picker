/**
 * Emoji Picker — server half.
 *
 * The GUI renders everything from the bundled dataset; the server only owns
 * the shared preferences (favorites, recents, skin tone) so they survive a
 * reload and sync across windows. Storage key: "emoji-picker/prefs".
 */
import { Plugin } from "@opencode/plugin"
import { EmojiPickerRpc, type EmojiPrefs } from "./rpc"
import { DEFAULT_PREFS, mergePrefs, normalizePrefs } from "./prefs"

const PREFS_KEY = "emoji-picker/prefs"

export default Plugin.define({
  id: "emoji-picker",
  async setup(ctx) {
    let prefs: EmojiPrefs = { ...DEFAULT_PREFS }
    try {
      const stored = (await ctx.storage.get(PREFS_KEY)) as unknown
      prefs = normalizePrefs(stored)
    } catch {
      /* first run or storage unavailable — defaults are fine */
    }

    await ctx.rpc.register(EmojiPickerRpc, {
      prefs: async () => ({ ...prefs }),
      setPrefs: async (raw) => {
        prefs = mergePrefs(prefs, raw)
        try {
          await ctx.storage.set(PREFS_KEY, { ...prefs })
        } catch {
          /* keep the in-memory value even if storage is unavailable */
        }
        return { ...prefs }
      },
    })
  },
})

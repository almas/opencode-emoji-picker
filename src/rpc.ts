/**
 * Emoji Picker — RPC contract shared by the server and GUI halves.
 *
 * Plain JSON Schema literals: the server validates input and output with
 * them, and the GUI types its client proxy from the same definition. The
 * emoji data itself ships inside the GUI bundle — this surface only carries
 * the user's favorites, recents and skin-tone choice.
 */
import type { Rpc } from "@opencode/schema/rpc"

export type EmojiPrefs = {
  /** Recently used emoji ids, newest first (capped server-side). */
  recent: string[]
  /** Pinned (favorite) emoji ids, newest first. */
  pinned: string[]
  /** Skin tone: 0 = default, 1..5 follow the Unicode modifiers. */
  skin: number
}

const stringArray = { type: "array", items: { type: "string" } } as const

export const EmojiPickerRpc = {
  id: "emoji-picker",
  methods: {
    // Current preferences.
    prefs: {
      input: { type: "object", properties: {} },
      output: {
        type: "object",
        properties: {
          recent: stringArray,
          pinned: stringArray,
          skin: { type: "number" },
        },
        required: ["recent", "pinned", "skin"],
      },
    },
    // Replace any subset of the preferences; returns the stored result.
    setPrefs: {
      input: {
        type: "object",
        properties: {
          recent: stringArray,
          pinned: stringArray,
          skin: { type: "number" },
        },
      },
      output: {
        type: "object",
        properties: {
          recent: stringArray,
          pinned: stringArray,
          skin: { type: "number" },
        },
        required: ["recent", "pinned", "skin"],
      },
    },
  },
  events: {},
} satisfies Rpc.PortableDefinition

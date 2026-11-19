// Regenerate src/data.ts from @emoji-mart/data: npm run gen-data
// (requires: npm i -D @emoji-mart/data)
// Generates src/data.ts for the emoji-picker plugin from @emoji-mart/data.
const path = require("path")
const fs = require("fs")
const d = require("@emoji-mart/data/sets/15/native.json")

const catNames = {
  people: "Smileys & Emotion",
  nature: "Animals & Nature",
  foods: "Food & Drink",
  activity: "Activity",
  places: "Travel & Places",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
}

const catIcons = {
  people: "😀",
  nature: "🌿",
  foods: "🍔",
  activity: "⚽",
  places: "✈️",
  objects: "💡",
  symbols: "❤️",
  flags: "🏁",
}

const categories = []
const emojis = {}
for (const cat of d.categories) {
  const list = []
  for (const id of cat.emojis) {
    const e = d.emojis[id]
    if (!e || !e.skins || !e.skins[0] || !e.skins[0].native) continue
    if (!list.includes(id)) list.push(id)
    if (!emojis[id]) {
      emojis[id] = { n: e.name, k: (e.keywords || []).join(" "), e: e.skins[0].native }
      const varis = e.skins.slice(1).map((s) => s.native).filter(Boolean)
      if (varis.length) emojis["v_" + id] = { n: e.name, k: "", v: varis }
    }
  }
  categories.push({ id: cat.id, name: catNames[cat.id] || cat.name, icon: catIcons[cat.id] || "🔤", ids: list })
}

const out = `/**
 * Emoji data, embedded so the picker works offline.
 *
 * Generated from @emoji-mart/data (Emoji Mart, MIT) — Unicode emoji data in
 * native form. Skin-tone variants are stored under a \`v_\` key with the same
 * id (five entries, lightest first). \`k\` holds search keywords.
 */

export interface EmojiEntry {
  /** Display character (native form). Absent on \`v_\` skin-variant entries. */
  e?: string
  /** English name. */
  n: string
  /** Space-separated search keywords. */
  k: string
  /** Skin-tone variants, lightest first. */
  v?: string[]
}

export interface EmojiCategory {
  id: string
  name: string
  /** Representative emoji, used as the tab icon. */
  icon: string
  ids: string[]
}

export const CATEGORIES: EmojiCategory[] = ${JSON.stringify(categories)}

export const EMOJIS: Record<string, EmojiEntry> = ${JSON.stringify(emojis)}
`

fs.writeFileSync(path.join(__dirname, "..", "src", "data.ts"), out)
console.log("bytes:", out.length, "entries:", Object.keys(emojis).length)
console.log("counts:", categories.map((c) => c.id + ":" + c.ids.length).join(" "))

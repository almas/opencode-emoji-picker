import { describe, expect, test } from "vitest"
import { CATEGORIES, EMOJIS } from "./data"
import { charFor, known, onlyKnown, searchIds } from "./filter"

describe("dataset", () => {
  test("categories resolve to known ids", () => {
    for (const cat of CATEGORIES) {
      expect(cat.ids.length).toBeGreaterThan(0)
      for (const id of cat.ids) expect(known(id)).toBe(true)
    }
  })

  test("skin variants carry five characters", () => {
    const wave = EMOJIS["v_wave"]
    expect(wave?.v).toBeDefined()
    expect(wave?.v?.length).toBe(5)
  })
})

describe("charFor", () => {
  test("default char without a skin tone", () => {
    expect(charFor("grinning", 0)).toBe("😀")
  })

  test("skin tone picks the variant", () => {
    expect(charFor("wave", 1)).toBe("👋🏻")
    expect(charFor("wave", 5)).toBe("👋🏿")
  })

  test("no variants falls back to the base char", () => {
    expect(charFor("grinning", 3)).toBe("😀")
  })

  test("unknown id resolves to undefined", () => {
    expect(charFor("no_such_emoji_at_all", 0)).toBeUndefined()
  })
})

describe("searchIds", () => {
  test("finds by name and keyword", () => {
    expect(searchIds("octopus").some((id) => id === "octopus")).toBe(true)
    expect(searchIds("thumbs up").some((id) => id === "+1" || id === "thumbs_up")).toBe(true)
  })

  test("all tokens must match", () => {
    const ids = searchIds("red car")
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids.slice(0, 20)) {
      const e = EMOJIS[id]
      const hay = `${id} ${e?.n ?? ""} ${e?.k ?? ""}`.toLowerCase()
      expect(hay).toContain("red")
      expect(hay).toContain("car")
    }
  })

  test("empty or blank query returns nothing", () => {
    expect(searchIds("")).toEqual([])
    expect(searchIds("   ")).toEqual([])
  })

  test("nonsense query returns nothing", () => {
    expect(searchIds("zzqxjvbwpp")).toEqual([])
  })

  test("respects the limit", () => {
    expect(searchIds("a", 10).length).toBeLessThanOrEqual(10)
  })
})

describe("onlyKnown", () => {
  test("filters stale ids out", () => {
    expect(onlyKnown(["grinning", "stale_id_xyz"])).toEqual(["grinning"])
  })
})

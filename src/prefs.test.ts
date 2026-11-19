import { describe, expect, test } from "vitest"
import { clampSkin, DEFAULT_PREFS, MAX_RECENT, mergePrefs, normalizePrefs, pushRecent, toggleId } from "./prefs"

describe("normalizePrefs", () => {
  test("defaults for garbage input", () => {
    for (const junk of [undefined, null, 42, "nope", []]) {
      expect(normalizePrefs(junk)).toEqual(DEFAULT_PREFS)
    }
  })

  test("drops non-strings, dedupes, caps recents", () => {
    const raw = { recent: ["a", 1, "a", "b", ...Array.from({ length: MAX_RECENT }, (_, i) => `x${i}`)], pinned: ["p", null, "p"], skin: 3 }
    const p = normalizePrefs(raw)
    expect(p.recent[0]).toBe("a")
    expect(p.recent[1]).toBe("b")
    expect(new Set(p.recent).size).toBe(p.recent.length)
    expect(p.recent.length).toBe(MAX_RECENT)
    expect(p.pinned).toEqual(["p"])
    expect(p.skin).toBe(3)
  })

  test("clamps skin tone into 0..5", () => {
    expect(clampSkin(-4)).toBe(0)
    expect(clampSkin(9)).toBe(5)
    expect(clampSkin("3")).toBe(3)
    expect(clampSkin("banana")).toBe(0)
    expect(clampSkin(undefined)).toBe(0)
    expect(normalizePrefs({ skin: 99.7 }).skin).toBe(5)
  })
})

describe("mergePrefs", () => {
  test("keeps current values for absent keys", () => {
    const current = { recent: ["a"], pinned: ["p"], skin: 2 }
    expect(mergePrefs(current, { skin: 4 })).toEqual({ recent: ["a"], pinned: ["p"], skin: 4 })
    expect(mergePrefs(current, {})).toEqual(current)
    expect(mergePrefs(current, null)).toEqual(current)
  })

  test("explicit keys replace, and are normalized", () => {
    const current = { recent: ["a"], pinned: [], skin: 1 }
    const next = mergePrefs(current, { recent: ["b", "b", "c"], skin: -2 })
    expect(next.recent).toEqual(["b", "c"])
    expect(next.skin).toBe(0)
    expect(next.pinned).toEqual([])
  })
})

describe("pushRecent / toggleId", () => {
  test("pushRecent moves to front, dedupes, caps", () => {
    expect(pushRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"])
    expect(pushRecent([], "x")).toEqual(["x"])
    const capped = pushRecent(Array.from({ length: MAX_RECENT }, (_, i) => `i${i}`), "new")
    expect(capped.length).toBe(MAX_RECENT)
    expect(capped[0]).toBe("new")
    expect(capped).not.toContain(`i${MAX_RECENT - 1}`)
  })

  test("toggleId adds at front and removes", () => {
    expect(toggleId(["a"], "b")).toEqual(["b", "a"])
    expect(toggleId(["b", "a"], "b")).toEqual(["a"])
  })
})

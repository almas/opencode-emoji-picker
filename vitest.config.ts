import { defineConfig } from "vitest/config"

// Unit tests run against the pure modules (prefs, filter); the GUI half is
// host-bound and covered by manual checks instead.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
})

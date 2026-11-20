import { configDefaults, defineConfig } from "vitest/config";

// Alte Arbeitskopien unter .claude/ (Worktrees) nicht mittesten: sie haben ihren eigenen, älteren Stand.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, ".claude/**"] },
});

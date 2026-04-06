import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"], // Build for commonJS and ESmodules
  dts: false, // TS deprecation causes tsup issue, generate via tsc
  splitting: false,
  sourcemap: true,
  clean: true,
});

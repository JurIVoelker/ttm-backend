import { resolve } from "node:path";

// Builds the standalone server binary (replaces the old inline `bun build --compile`).
//
// Why this script exists instead of a one-line CLI build:
// `bun build --compile` always transforms JSX with React's *development* automatic
// runtime, emitting `jsxDEV(...)` calls. Under NODE_ENV=production, `react/jsx-dev-runtime`
// resolves to `react-jsx-dev-runtime.production.js`, which sets `jsxDEV = undefined`.
// The bundled React Email templates then crash at runtime with "jsxDEV is not a function".
// We bundle via the JS API so we can alias `react/jsx-dev-runtime` to React's real
// development implementation, keeping NODE_ENV=production everywhere else.
const devJsxRuntime = resolve(
  "node_modules/react/cjs/react-jsx-dev-runtime.development.js",
);

const result = await Bun.build({
  entrypoints: ["src/entrypoint.ts"],
  target: "bun",
  minify: true,
  sourcemap: "linked",
  // `compile` is supported by the bundler but not yet in Bun's TS types.
  ...({ compile: { outfile: "out/server" } } as object),
  plugins: [
    {
      name: "force-dev-jsx-runtime",
      setup(build) {
        build.onResolve({ filter: /^react\/jsx-dev-runtime$/ }, () => ({
          path: devJsxRuntime,
        }));
      },
    },
  ],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("Built out/server");

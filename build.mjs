// Builds the extension into dist/ with Vite: minified, obfuscated, and with no source maps.
// The YouTube Music search and matcher aren't in this repository. build.local.json (git-ignored)
// says where they are, and where Vite and javascript-obfuscator are installed:
//   { "search": "<folder holding videoSearch.ts and videoSearchRequest.ts>",
//     "store": "<pnpm store folder (node_modules/.pnpm) holding vite and javascript-obfuscator>" }
// Relative paths are read from this folder. Run: node build.mjs
import fs from "node:fs"
import path from "node:path"

const here = path.dirname(new URL(import.meta.url).pathname)
const localFile = path.join(here, "build.local.json")
if (!fs.existsSync(localFile)) throw new Error("build.local.json is missing: see the comment at the top of build.mjs")
const local = JSON.parse(fs.readFileSync(localFile, "utf8"))
const search = path.resolve(here, local.search)
const store = path.resolve(here, local.store)

/** Imports a package from the pnpm store by name. */
async function fromStore(name, entry) {
  const folder = fs.readdirSync(store).filter((item) => item.startsWith(`${name}@`)).sort().at(-1)
  return import(path.join(store, folder, "node_modules", name, entry))
}

const { build } = await fromStore("vite", "dist/node/index.js")
const { default: Obfuscator } = await fromStore("javascript-obfuscator", "dist/index.js")

/** Obfuscates every output chunk. A fixed seed keeps unchanged code building the same bytes. */
const obfuscate = {
  name: "obfuscate-output",
  apply: "build",
  enforce: "post",
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== "chunk") continue
      chunk.code = Obfuscator.obfuscate(chunk.code, {
        disableConsoleOutput: true,
        stringArray: false,
        sourceMap: false,
        seed: 1
      }).getObfuscatedCode()
      chunk.map = null
    }
  }
}

/** One self-contained script per entry: Chrome loads them as classic scripts. */
async function bundle(entry, name, banner = "") {
  await build({
    configFile: false,
    root: here,
    logLevel: "warn",
    plugins: [obfuscate],
    resolve: {
      alias: { "youtube-search": search },
      conditions: ["browser"]
    },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: path.join(here, "dist"),
      emptyOutDir: false,
      target: "chrome120",
      minify: true,
      sourcemap: false,
      reportCompressedSize: false,
      lib: { entry: path.join(here, entry), name, formats: ["iife"], fileName: () => `${name}.js` },
      rolldownOptions: { output: { banner, comments: { legal: false } } }
    }
  })
  const file = path.join(here, "dist", `${name}.js`)
  console.log(`dist/${name}.js ${Math.round(fs.statSync(file).size / 1024)} KB`)
}

fs.rmSync(path.join(here, "dist"), { recursive: true, force: true })
await bundle("src/content/index.ts", "content")
// youtubei.js keeps fetch and calls it detached ("Illegal invocation" in a service worker),
// and its browser build reads window.crypto, which a service worker has no window for.
await bundle(
  "src/background/index.ts",
  "background",
  "globalThis.fetch = globalThis.fetch.bind(globalThis); globalThis.window ??= globalThis;"
)

// Builds the extension and zips what Chrome needs into release/, ready to send to people.
// The zip holds one folder, so it unzips into something to choose in "Load unpacked".
// Run: node package.mjs
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const here = path.dirname(new URL(import.meta.url).pathname)
const { version } = JSON.parse(fs.readFileSync(path.join(here, "manifest.json"), "utf8"))
const name = "Tracklist-Videos-for-Discogs"
const release = path.join(here, "release")
const staging = path.join(release, name)
const zip = path.join(release, `${name}-${version}.zip`)
const files = ["manifest.json", "INSTALL.txt", "dist/background.js", "dist/content.js", "src/content/style.css"]

execFileSync(process.execPath, [path.join(here, "build.mjs")], { stdio: "inherit" })

fs.rmSync(staging, { recursive: true, force: true })
fs.rmSync(zip, { force: true })
for (const file of files) {
  fs.mkdirSync(path.dirname(path.join(staging, file)), { recursive: true })
  fs.copyFileSync(path.join(here, file), path.join(staging, file))
}
execFileSync("zip", ["-rqX", zip, name], { cwd: release })
fs.rmSync(staging, { recursive: true, force: true })
console.log(`${path.relative(here, zip)} (${Math.round(fs.statSync(zip).size / 1024)} KB)`)

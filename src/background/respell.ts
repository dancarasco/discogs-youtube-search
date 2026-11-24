import type { VideoSearchCandidate } from "youtube-search/videoSearchCandidate"
import { cleanup } from "youtube-search/videoSearch.ts"

/** Shortest word that may be respelt: shorter words differ by one letter too easily. */
const minimumLength = 4

/**
 * Other spellings of a title found in uploads: the same words in the same order with exactly
 * one word a letter off ("Marie Teresa" in Discogs, "Maria Teresa" on YouTube). A bracketed
 * part, such as "(Remix)", is kept as written. Single-word titles are never respelt.
 */
export function respellings(title: string, videos: VideoSearchCandidate[]): string[] {
  const brackets = title.match(/[([][^)\]]*[)\]]/g) ?? []
  const target = words(title.replace(/[([][^)\]]*[)\]]/g, " "))
  if (target.length < 2) return []
  const found = new Set<string>()
  for (const video of videos) {
    const candidate = words(video.title)
    for (let start = 0; start + target.length <= candidate.length; start += 1) {
      const run = candidate.slice(start, start + target.length)
      const changed = run.flatMap((word, index) => (word === target[index] ? [] : [index]))
      if (changed.length !== 1) continue
      const [index] = changed
      if (oneLetterOff(target[index], run[index])) found.add([...run, ...brackets].join(" "))
    }
  }
  return [...found]
}

/**
 * Other names to try for a track's artist, in order: the main Discogs name when the release
 * credits it differently, then each without a leading "The" ("The Holy Ghost" is uploaded as
 * "Holy Ghost").
 */
export function artistSpellings(artist: string, mainArtist?: string): string[] {
  const names = [artist, ...(mainArtist ? [mainArtist] : [])]
  const withoutThe = names.map((name) => name.replace(/(^|,\s*|&\s*|\band\s+)the\s+/gi, "$1").trim())
  return [...new Set([...names, ...withoutThe])].filter((name) => name && name !== artist)
}

/** True when one substitution, insertion or deletion turns one word into the other. */
function oneLetterOff(first: string, second: string): boolean {
  if (first.length < minimumLength || second.length < minimumLength) return false
  if (Math.abs(first.length - second.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < first.length && j < second.length) {
    if (first[i] === second[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (first.length > second.length) i += 1
    else if (second.length > first.length) j += 1
    else {
      i += 1
      j += 1
    }
  }
  return edits + (first.length - i) + (second.length - j) === 1
}

function words(value: string): string[] {
  return cleanup(value).split(/\s+/).filter(Boolean)
}

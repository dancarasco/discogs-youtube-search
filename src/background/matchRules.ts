import type { VideoSearchCandidate } from "youtube-search/videoSearchCandidate"
import { cleanup, compareTwoStrings } from "youtube-search/videoSearch.ts"

/**
 * Two checks the extension adds before the YouTube matcher chooses. The matcher compares
 * title words as a bag, which lets "The Next Step Is Love" stand in for "Love Is", and its
 * artist check accepts "Danny Bond" for "Danny B". Discogs titles are often short and
 * artists obscure, so both are tightened here.
 */

const fillerWords = new Set(["a", "an", "and", "the", "of", "in", "to", "with", "feat", "featuring", "ft"])
const versionWords = new Set([
  "mix", "remix", "edit", "version", "dub", "instrumental", "extended", "radio", "club",
  "original", "live", "remaster", "remastered", "vocal", "rework", "bootleg"
])
const channelSuffixes = ["vevo", "official", "music", "tv", "topic"]

/**
 * True when the track title's words that appear in the video title appear in the same
 * order. Words that are missing are left to the matcher's coverage check.
 */
export function keepsTitleOrder(videoTitle: string, trackTitle: string): boolean {
  const target = words(trackTitle).filter((word) => !fillerWords.has(word) && !versionWords.has(word))
  const video = words(videoTitle)
  const present = new Set(target.filter((word) => video.some((other) => sameWord(word, other))))
  return commonRun(target, video) >= present.size
}

/** True when the title, channel or credited artist names one of the artists as whole words. */
export function namesArtist(video: VideoSearchCandidate, artistValue: string): boolean {
  const fields = [video.title, video.author?.name ?? "", video.artist ?? ""].map(words)
  return artistValue
    .split(/\s*(?:,|&|\/|\band\b|\bfeat\.?|\bft\.?|\bvs\.?|\bmeets\b)\s*/i)
    .map(words)
    .filter((name) => name.length > 0)
    .some((name) => fields.some((field) => containsName(field, name)))
}

function containsName(field: string[], name: string[]): boolean {
  for (let start = 0; start + name.length <= field.length; start += 1)
    if (name.every((word, offset) => sameWord(word, field[start + offset]))) return true
  // Channel names run words together: "EekAMouseVEVO", "dannyb".
  const compact = name.join("")
  return compact.length >= 4 && field.some((word) => word === compact || channelSuffixes.some((suffix) => word === compact + suffix))
}

/** Length of the longest run of target words found in order in the video words. */
function commonRun(target: string[], video: string[]): number {
  const lengths = Array.from({ length: target.length + 1 }, () => new Array<number>(video.length + 1).fill(0))
  for (let i = 1; i <= target.length; i += 1)
    for (let j = 1; j <= video.length; j += 1)
      lengths[i][j] = sameWord(target[i - 1], video[j - 1])
        ? lengths[i - 1][j - 1] + 1
        : Math.max(lengths[i - 1][j], lengths[i][j - 1])
  // Repeated words ("Go Down Moses, Go Down") count once, like the set of present words.
  return Math.min(lengths[target.length][video.length], new Set(target).size)
}

function sameWord(first: string, second: string): boolean {
  if (first === second) return true
  return first.length >= 4 && second.length >= 4 && compareTwoStrings(first, second) >= 0.85
}

function words(value: string): string[] {
  return cleanup(value).split(/\s+/).filter(Boolean)
}

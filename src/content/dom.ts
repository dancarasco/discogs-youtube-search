import type { Track } from "../types"

/** Creates an element with classes and optional text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** The medium YouTube thumbnail for a video id. */
export function thumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
}

/** A small magnifier linking to a YouTube search for the track, for when nothing matched. */
export function searchLink(track: Track): HTMLAnchorElement {
  const query = `${track.artist} ${track.title}`
  const link = el("a", "dtv-search")
  link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  link.target = "_blank"
  link.rel = "noopener"
  link.title = `Search YouTube for “${query}”`
  link.setAttribute("aria-label", link.title)
  link.append(el("span", "dtv-lens"))
  return link
}

/** Seconds as m:ss. */
export function clock(seconds: number): string {
  return seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "–:––"
}

/** Animated equaliser bars. */
export function bars(): HTMLSpanElement {
  const node = el("span", "dtv-bars")
  for (let index = 0; index < 4; index += 1) node.append(el("i"))
  return node
}

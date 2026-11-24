import type { Track, TrackMatch } from "../types"
import { clock, el, searchLink, thumbnail } from "./dom"

/** The match cell added to each Discogs tracklist row. */
export class TrackRows {
  private readonly cells = new Map<string, HTMLTableCellElement>()
  private readonly rows = new Map<string, HTMLTableRowElement>()

  constructor(
    table: HTMLTableElement,
    private readonly onPlay: (position: string) => void
  ) {
    for (const row of table.querySelectorAll<HTMLTableRowElement>("tr[data-track-position]")) {
      const position = row.dataset.trackPosition ?? ""
      row.querySelector(".dtv-cell")?.remove()
      const cell = el("td", "dtv-cell dtv-waiting")
      cell.append(el("span", "dtv-dot"))
      row.append(cell)
      row.classList.add("dtv-row")
      this.cells.set(position, cell)
      this.rows.set(position, row)
    }
  }

  /** Discogs tracks with no row on the page (rare) are left out of the page but still play. */
  has(track: Track): boolean {
    return this.cells.has(track.position)
  }

  searching(position: string): void {
    const cell = this.cells.get(position)
    if (!cell) return
    cell.className = "dtv-cell dtv-searching"
    cell.replaceChildren(el("span", "dtv-shimmer"), el("span", "dtv-shimmer dtv-short"))
  }

  found(match: TrackMatch, track?: Track): void {
    const cell = this.cells.get(match.position)
    if (!cell) return
    const [video, ...others] = match.videos
    if (!video) {
      cell.className = "dtv-cell dtv-none"
      cell.replaceChildren(el("span", "dtv-miss", match.failed ? "search failed" : "not on YouTube"))
      if (track) cell.append(searchLink(track))
      return
    }
    const button = el("button", "dtv-match")
    button.title = `${video.title} · ${video.channel}`
    const thumb = el("span", "dtv-thumb")
    thumb.style.backgroundImage = `url(${thumbnail(video.id)})`
    thumb.append(el("span", "dtv-play"))
    const text = el("span", "dtv-text")
    text.append(el("span", "dtv-title", video.title), el("span", "dtv-meta", `${video.channel} · ${clock(video.seconds)}`))
    button.append(thumb, text)
    if (others.length) button.append(el("span", "dtv-more", `+${others.length}`))
    button.addEventListener("click", () => this.onPlay(match.position))
    cell.className = "dtv-cell dtv-found"
    cell.replaceChildren(button)
  }

  /** Marks the row that is playing, with the bars animating while it plays. */
  playing(position: string | null): void {
    for (const [key, row] of this.rows) row.classList.toggle("dtv-now", key === position)
  }
}

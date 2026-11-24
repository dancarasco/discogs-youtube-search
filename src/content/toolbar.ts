import { el } from "./dom"

/**
 * The line above the tracklist. It starts with one button that kicks off the search, then
 * shows progress, Play all and the YouTube playlist link.
 */
export class Toolbar {
  readonly root = el("div", "dtv-toolbar")
  private readonly findButton = el("button", "dtv-btn dtv-find")
  private readonly status = el("span", "dtv-status")
  private readonly spinner = el("span", "dtv-spinner")
  private readonly playButton = el("button", "dtv-btn")
  private readonly playlistLink = el("a", "dtv-btn")

  constructor(onFind: () => void, onPlay: () => void) {
    this.findButton.append(el("span", "dtv-lens"), el("span", "", "Find tracks on YouTube"))
    this.findButton.addEventListener("click", () => {
      this.findButton.hidden = true
      this.spinner.hidden = false
      this.status.textContent = "Searching YouTube…"
      onFind()
    })
    this.playButton.append(el("span", "dtv-tri"), el("span", "", "Play all"))
    this.playButton.hidden = true
    this.playButton.addEventListener("click", onPlay)
    this.playlistLink.textContent = "Open as YouTube playlist"
    this.playlistLink.target = "_blank"
    this.playlistLink.rel = "noopener"
    this.playlistLink.hidden = true
    this.spinner.hidden = true
    this.root.append(
      el("span", "dtv-label", "Videos"),
      this.findButton,
      this.spinner,
      this.status,
      el("span", "dtv-gap"),
      this.playButton,
      this.playlistLink
    )
  }

  progress(found: number, done: number, total: number, finished: boolean): void {
    this.spinner.hidden = finished
    this.status.textContent = finished
      ? `${found} of ${total} tracks found on YouTube`
      : `Searching YouTube… ${done} of ${total}`
    this.playButton.hidden = found === 0
  }

  /** YouTube builds an unsaved playlist from up to 50 ids. */
  playlist(ids: string[]): void {
    this.playlistLink.hidden = ids.length === 0
    this.playlistLink.href = `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0, 50).join(",")}`
  }

  error(message: string): void {
    this.spinner.hidden = true
    this.status.textContent = message
    this.root.classList.add("dtv-error")
  }
}

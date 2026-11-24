import type { Track, TrackMatch } from "../types"
import { bars, el, thumbnail } from "./dom"

const endedState = 0

/**
 * Floating player that plays the record through YouTube's embed, moving on to the next
 * found track when one ends. Other uploads of the playing track can be swapped in.
 */
export class Player {
  private readonly root = el("div", "dtv-player")
  private readonly frame = el("iframe", "dtv-frame")
  private readonly heading = el("div", "dtv-heading")
  private readonly alternates = el("div", "dtv-alts")
  private tracks: Track[] = []
  private matches = new Map<string, TrackMatch>()
  private position: string | null = null

  constructor(private readonly onChange: (position: string | null) => void) {
    this.frame.allow = "autoplay; encrypted-media; picture-in-picture"
    this.frame.allowFullscreen = true
    this.frame.addEventListener("load", () => this.listen())

    const controls = el("div", "dtv-controls")
    const prev = el("button", "dtv-icon", "⏮")
    const next = el("button", "dtv-icon", "⏭")
    const close = el("button", "dtv-icon", "✕")
    prev.title = "Previous track"
    next.title = "Next track"
    close.title = "Close"
    prev.addEventListener("click", () => this.step(-1))
    next.addEventListener("click", () => this.step(1))
    close.addEventListener("click", () => this.close())
    controls.append(prev, next, close)

    const top = el("div", "dtv-top")
    top.append(bars(), this.heading, controls)
    const screen = el("div", "dtv-screen")
    screen.append(this.frame)
    this.root.append(top, screen, this.alternates)
    window.addEventListener("message", (event) => this.onFrameMessage(event))
  }

  update(tracks: Track[], matches: Map<string, TrackMatch>): void {
    this.tracks = tracks
    this.matches = matches
  }

  /** Plays the first found track, or the given one, and the record onwards from there. */
  play(position = this.playable()[0], videoIndex = 0): void {
    const track = this.tracks.find((item) => item.position === position)
    const video = this.matches.get(position ?? "")?.videos[videoIndex]
    if (!track || !video) return
    if (!this.root.isConnected) document.body.append(this.root)
    requestAnimationFrame(() => this.root.classList.add("dtv-open"))
    this.position = track.position
    this.frame.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0&origin=${encodeURIComponent(location.origin)}`
    this.heading.replaceChildren(
      el("span", "dtv-pos", track.position),
      el("span", "dtv-now-title", `${track.artist} – ${track.title}`)
    )
    this.renderAlternates(track.position, videoIndex)
    this.onChange(track.position)
  }

  close(): void {
    this.frame.src = "about:blank"
    this.root.classList.remove("dtv-open")
    this.position = null
    this.onChange(null)
  }

  private step(direction: 1 | -1): void {
    const playable = this.playable()
    const next = playable[playable.indexOf(this.position ?? "") + direction]
    if (next) this.play(next)
    else if (direction === 1) this.close()
  }

  private playable(): string[] {
    return this.tracks
      .map((track) => track.position)
      .filter((position) => (this.matches.get(position)?.videos.length ?? 0) > 0)
  }

  private renderAlternates(position: string, current: number): void {
    const videos = this.matches.get(position)?.videos ?? []
    this.alternates.replaceChildren()
    this.alternates.hidden = videos.length < 2
    videos.forEach((video, index) => {
      const button = el("button", `dtv-alt${index === current ? " dtv-current" : ""}`)
      button.style.backgroundImage = `url(${thumbnail(video.id)})`
      button.title = `${video.title} · ${video.channel}`
      button.addEventListener("click", () => this.play(position, index))
      this.alternates.append(button)
    })
  }

  /** Asks the embed to report its state so the player can move on when a track ends. */
  private listen(): void {
    const target = this.frame.contentWindow
    if (!target || this.frame.src === "about:blank") return
    target.postMessage(JSON.stringify({ event: "listening", id: "dtv", channel: "widget" }), "*")
    target.postMessage(
      JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id: "dtv", channel: "widget" }),
      "*"
    )
  }

  private onFrameMessage(event: MessageEvent): void {
    if (event.source !== this.frame.contentWindow || typeof event.data !== "string") return
    let data: { event?: string; info?: number | { playerState?: number } }
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    const state =
      data.event === "onStateChange" ? data.info : data.event === "infoDelivery" && typeof data.info === "object" ? data.info.playerState : undefined
    this.root.classList.toggle("dtv-paused", state === 2)
    if (state === endedState) this.step(1)
  }
}

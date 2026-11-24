import type { LookupMessage, LookupRequest, Track, TrackMatch } from "../types"
import { Player } from "./player"
import { TrackRows } from "./rows"
import { Toolbar } from "./toolbar"

/**
 * Adds YouTube matches to a Discogs release or master page. Discogs navigates
 * without reloading, so the page is re-checked whenever its address changes.
 */
let currentPage = ""
let port: chrome.runtime.Port | undefined
const player = new Player((position) => rows?.playing(position))
let rows: TrackRows | undefined

function pageRequest(): LookupRequest | null {
  const match = location.pathname.match(/\/(release|master)\/(\d+)/)
  return match ? { kind: match[1] === "master" ? "masters" : "releases", id: match[2] } : null
}

function start(): void {
  const request = pageRequest()
  const table = document.querySelector<HTMLTableElement>("#release-tracklist table, #master-tracklist table")
  const key = request ? `${request.kind}/${request.id}` : ""
  if (!request || !table) return
  // A re-render that dropped the bar runs the lookup again; the worker answers from its cache.
  if (key === currentPage && document.querySelector(".dtv-toolbar")?.isConnected) return
  currentPage = key
  port?.disconnect()
  player.close()

  rows = undefined
  const toolbar = new Toolbar(
    () => find(request, table, toolbar),
    () => player.play()
  )
  document.querySelector(".dtv-toolbar")?.remove()
  table.before(toolbar.root)
}

/** Searches when the button is pressed, filling each row as its match arrives. */
function find(request: LookupRequest, table: HTMLTableElement, toolbar: Toolbar): void {
  const tracks: Track[] = []
  const matches = new Map<string, TrackMatch>()
  rows = new TrackRows(table, (position) => player.play(position))

  const refresh = (finished: boolean): void => {
    const found = [...matches.values()].filter((match) => match.videos.length > 0)
    toolbar.progress(found.length, matches.size, tracks.length, finished)
    toolbar.playlist(tracks.flatMap((track) => matches.get(track.position)?.videos[0]?.id ?? []))
    player.update(tracks, matches)
  }

  port = chrome.runtime.connect({ name: "lookup" })
  port.onMessage.addListener((message: LookupMessage) => {
    if (message.type === "release") {
      tracks.splice(0, tracks.length, ...message.tracks)
      refresh(false)
    } else if (message.type === "searching") rows?.searching(message.position)
    else if (message.type === "match") {
      matches.set(message.match.position, message.match)
      rows?.found(message.match, tracks.find((track) => track.position === message.match.position))
      refresh(false)
    } else if (message.type === "done") refresh(true)
    else if (message.type === "error") toolbar.error(message.message)
  })
  port.postMessage(request)
}

start()
new MutationObserver(() => start()).observe(document.body, { childList: true, subtree: true })

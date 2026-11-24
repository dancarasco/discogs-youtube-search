import type { LookupMessage, LookupRequest, TrackMatch } from "../types"
import { fetchRelease } from "./discogs"
import { findTrackVideos } from "./match"
import { registerYouTubeHeaders } from "./headers"

const searchGapMs = 1_500
const cachePrefix = "lookup:"
const headersReady = registerYouTubeHeaders()

/**
 * Streams a release's tracklist, then each track's YouTube matches, to the page as they are
 * found. Finished lookups are kept for the browser session so a revisit is instant.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "lookup") return
  let open = true
  port.onDisconnect.addListener(() => (open = false))
  const send = (message: LookupMessage): void => {
    if (open) port.postMessage(message)
  }
  port.onMessage.addListener((request: LookupRequest) => {
    lookup(request, send, () => open).catch((error: unknown) =>
      send({ type: "error", message: error instanceof Error ? error.message : String(error) })
    )
  })
})

async function lookup(
  request: LookupRequest,
  send: (message: LookupMessage) => void,
  isOpen: () => boolean
): Promise<void> {
  const key = `${cachePrefix}${request.kind}/${request.id}`
  const cached = (await chrome.storage.session.get(key))[key]
  if (cached) {
    send({ type: "release", ...cached.release })
    for (const match of cached.matches as TrackMatch[]) send({ type: "match", match })
    send({ type: "done" })
    return
  }

  await headersReady
  const release = await fetchRelease(request)
  send({ type: "release", ...release })
  const matches: TrackMatch[] = []
  for (const [index, track] of release.tracks.entries()) {
    if (!isOpen()) return
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, searchGapMs))
    send({ type: "searching", position: track.position })
    let match: TrackMatch
    try {
      match = { position: track.position, videos: await findTrackVideos(track) }
    } catch (error) {
      console.warn(`Search failed for ${track.position}`, error)
      match = { position: track.position, videos: [], failed: true }
    }
    matches.push(match)
    send({ type: "match", match })
  }
  if (matches.every((match) => !match.failed))
    await chrome.storage.session.set({ [key]: { release, matches } })
  send({ type: "done" })
}

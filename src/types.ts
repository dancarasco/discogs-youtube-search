/** One YouTube upload offered for a track. */
export interface TrackVideo {
  id: string
  title: string
  channel: string
  seconds: number
}

/** A Discogs track as the page and the player see it. */
export interface Track {
  position: string
  artist: string
  /** The artists' main Discogs names, when the release credits them differently (ANV). */
  mainArtist?: string
  title: string
  duration: string
}

/** Lookup outcome for one track: the chosen video first, then other credible uploads. */
export interface TrackMatch {
  position: string
  videos: TrackVideo[]
  failed?: boolean
}

/** Messages the background worker streams to the page over the lookup port. */
export type LookupMessage =
  | { type: "release"; title: string; artist: string; tracks: Track[] }
  | { type: "searching"; position: string }
  | { type: "match"; match: TrackMatch }
  | { type: "done" }
  | { type: "error"; message: string }

/** What the page asks for: a Discogs release or master id. */
export interface LookupRequest {
  kind: "releases" | "masters"
  id: string
}

import type { LookupRequest, Track } from "../types"

type DiscogsArtist = { name: string; anv?: string; join?: string }
type DiscogsTrack = {
  position: string
  title: string
  duration: string
  type_: string
  artists?: DiscogsArtist[]
}

/** A release's credited artist, title and playable tracks. */
export interface DiscogsRelease {
  title: string
  artist: string
  tracks: Track[]
}

/** Reads a release or master from the public Discogs API (no account needed). */
export async function fetchRelease({ kind, id }: LookupRequest): Promise<DiscogsRelease> {
  const response = await fetch(`https://api.discogs.com/${kind}/${id}`, {
    signal: AbortSignal.timeout(30_000)
  })
  if (!response.ok) throw new Error(`Discogs answered ${response.status}`)
  const release = await response.json()
  const releaseArtists: DiscogsArtist[] = release.artists ?? []
  const artist = artistName(releaseArtists)
  const tracks = (release.tracklist as DiscogsTrack[])
    .filter((track) => track.type_ === "track")
    .map((track) => {
      const artists = track.artists?.length ? track.artists : releaseArtists
      const credited = artistName(artists)
      const main = artistName(artists, false)
      return {
        position: track.position,
        artist: credited,
        ...(main !== credited ? { mainArtist: main } : {}),
        title: track.title,
        duration: track.duration
      }
    })
  return { title: release.title, artist, tracks }
}

/**
 * Joins the artists as printed on the release (ANV), or by their main Discogs names, and drops
 * Discogs' "(2)" disambiguation.
 */
function artistName(artists: DiscogsArtist[], asCredited = true): string {
  return artists
    .map((artist, index) => {
      const name = ((asCredited && artist.anv) || artist.name).replace(/\s\(\d+\)$/, "")
      const join = index < artists.length - 1 ? artist.join || "," : ""
      return join === "," ? `${name}, ` : join ? `${name} ${join} ` : name
    })
    .join("")
    .trim()
}

import type { Track, TrackVideo } from "../types"
import type { VideoSearchCandidate } from "youtube-search/videoSearchCandidate"
import { getYouTubeVideoId, selectVideoUrl } from "youtube-search/videoSearch.ts"
import { searchVideoCandidates } from "youtube-search/videoSearchRequest.ts"
import { keepsTitleOrder, namesArtist } from "./matchRules"
import { artistSpellings, respellings } from "./respell"

const maxVideos = 6

/**
 * Finds a track's uploads with the YouTube Music search and matcher. The matcher makes every
 * choice, among the uploads that keep the title's word order and, where any do, name the artist.
 */
export async function findTrackVideos(track: Track): Promise<TrackVideo[]> {
  const candidates = await searchVideoCandidates(track.artist, track.title)
  return chooseVideos(track, candidates).flatMap((video) => {
    const id = getYouTubeVideoId(video.url)
    return id ? [{ id, title: video.title, channel: video.author?.name ?? "", seconds: video.seconds }] : []
  })
}

/**
 * The matcher's picks in order of preference. Only when it finds nothing are other spellings
 * tried, on the same results: the artist's other names ("Holy Ghost" for "The Holy Ghost"),
 * then the title as the artist's uploads spell it ("Maria Teresa" for "Marie Teresa").
 */
export function chooseVideos(track: Track, videos: VideoSearchCandidate[]): VideoSearchCandidate[] {
  for (const artist of [track.artist, ...artistSpellings(track.artist, track.mainArtist)]) {
    const picks = choose({ ...track, artist }, videos)
    if (picks.length > 0) return picks
  }
  for (const artist of [track.artist, ...artistSpellings(track.artist, track.mainArtist)]) {
    const named = videos.filter((video) => namesArtist(video, artist))
    for (const title of respellings(track.title, named)) {
      const respelt = choose({ ...track, artist, title }, videos)
      if (respelt.length > 0) return respelt
    }
  }
  return []
}

function choose(track: Track, videos: VideoSearchCandidate[]): VideoSearchCandidate[] {
  const ordered = videos.filter((video) => keepsTitleOrder(video.title, track.title))
  const named = ordered.filter((video) => namesArtist(video, track.artist))
  const picks = rank(track, named)
  return picks.length > 0 ? picks : rank(track, ordered)
}

function rank(track: Track, videos: VideoSearchCandidate[]): VideoSearchCandidate[] {
  const picks: VideoSearchCandidate[] = []
  let rest = videos
  while (picks.length < maxVideos) {
    const url = selectVideoUrl(track.artist, track.title, rest)
    const pick = url ? rest.find((video) => video.url === url) : undefined
    if (!pick) break
    picks.push(pick)
    rest = rest.filter((video) => video.url !== url)
  }
  return picks
}

import { z } from "zod"
import type { TiktokVideo_gd_lu702nij2f790tmv9h } from "@/types/tiktok_video_url_types"

/**
 * Normalises TikTok video payloads from the Phyllo scraper into the exact shape
 * Bright Data's `gd_lu702nij2f790tmv9h` dataset returns, so clients receive one
 * consistent type no matter which provider ran the scrape.
 */

const phylloAudioSchema = z.object({
  id: z.string().nullish(),
  title: z.string().nullish(),
  duration: z.number().nullish(),
  play_url: z.string().nullish(),
  cover_url: z.string().nullish(),
  author_name: z.string().nullish(),
  is_original: z.boolean().nullish(),
})

const phylloVideoSchema = z.object({
  id: z.string().nullish(),
  url: z.string(),
  audio: phylloAudioSchema.nullish(),
  caption: z.string().nullish(),
  hashtags: z.array(z.string()).nullish(),
  timestamp: z.string().nullish(),
  like_count: z.number().nullish(),
  media_urls: z.array(z.string()).nullish(),
  save_count: z.number().nullish(),
  view_count: z.number().nullish(),
  share_count: z.number().nullish(),
  content_type: z.string().nullish(),
  comment_count: z.number().nullish(),
  thumbnail_url: z.string().nullish(),
  follower_count: z.number().nullish(),
  video_duration: z.number().nullish(),
  author_username: z.string().nullish(),
  video_play_count: z.number().nullish(),
  author_display_name: z.string().nullish(),
})

export type PhylloVideo = z.infer<typeof phylloVideoSchema>

/** Phyllo returns hashtags with the leading `#`; the Bright Data dataset does not. */
function stripHash(hashtag: string): string {
  return hashtag.startsWith("#") ? hashtag.slice(1) : hashtag
}

function toIsoString(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function buildMusic(
  audio: PhylloVideo["audio"],
): TiktokVideo_gd_lu702nij2f790tmv9h["music"] {
  if (!audio) return null
  return {
    authorname: audio.author_name ?? null,
    covermedium: audio.cover_url ?? null,
    id: audio.id ?? null,
    original: audio.is_original ?? null,
    playurl: audio.play_url ?? null,
    title: audio.title ?? null,
  }
}

/**
 * Maps a single Phyllo video object. Returns `null` for anything without a `url`,
 * mirroring how the Bright Data webhook path drops unusable rows.
 */
export function formatPhylloVideo(input: unknown): TiktokVideo_gd_lu702nij2f790tmv9h | null {
  const parsed = phylloVideoSchema.safeParse(input)
  if (!parsed.success) return null

  const video = parsed.data
  const username = video.author_username ?? null
  const shareCount = video.share_count ?? null
  const playCount = video.video_play_count ?? video.view_count ?? undefined

  return {
    url: video.url,
    post_id: video.id ?? undefined,
    shortcode: video.id ?? undefined,
    description: video.caption ?? undefined,
    create_time: toIsoString(video.timestamp),
    digg_count: video.like_count ?? undefined,
    share_count: shareCount === null ? null : String(shareCount),
    num_share_count: shareCount,
    collect_count: video.save_count ?? undefined,
    comment_count: video.comment_count ?? undefined,
    play_count: playCount,
    video_duration: video.video_duration ?? undefined,
    hashtags: video.hashtags ? video.hashtags.map(stripHash) : null,
    original_sound: video.audio?.is_original ? (video.audio.title ?? null) : null,
    music: buildMusic(video.audio),
    profile_username: username,
    profile_url: username ? `https://www.tiktok.com/@${username}` : undefined,
    profile_followers: video.follower_count ?? null,
    preview_image: video.thumbnail_url ?? undefined,
    post_type: video.content_type ?? undefined,
    carousel_images: video.media_urls?.length ? video.media_urls : null,

    // Phyllo does not return these — kept explicit so the payload shape stays
    // stable across providers.
    profile_biography: null,
    is_verified: null,
    account_id: null,
    discovery_input: null,
    video_url: null,
    cdn_url: null,
    cdn_link: null,
    tagged_user: null,
    tt_chain_token: null,
    region: null,
    country: null,
    commerce_info: null,
    subtitle_url: null,
    subtitle_format: null,
    subtitle_info: null,
  }
}

export function formatPhylloVideos(input: unknown[]): TiktokVideo_gd_lu702nij2f790tmv9h[] {
  return input
    .map(formatPhylloVideo)
    .filter((video): video is TiktokVideo_gd_lu702nij2f790tmv9h => video !== null)
}

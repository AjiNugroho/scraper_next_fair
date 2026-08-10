import { z } from "zod"

/**
 * Converts TikTok video payloads from the Phyllo scraper into the unified post
 * shape clients receive, and wraps them in the `{ identifier, date_scraped, posts,
 * extras }` envelope — the same envelope the Instagram tagged webhook sends.
 *
 * Field defaults follow the client contract: a missing key is still present as
 * `null`, missing numbers become `0`, and missing arrays become `null`.
 */

// ---------------------------------------------------------------------------
// Outgoing client contract
// ---------------------------------------------------------------------------

export type ConvertedTaggedUser = {
  full_name: string | null
  id: string | null
  is_verified: boolean | null
  profile_pic_url: string | null
  username: string | null
}

export type ConvertedReply = {
  comments: string | null
  user_commenting: string | null
  likes: number
}

export type ConvertedComment = ConvertedReply & {
  replies: ConvertedReply[] | null
  profile_picture: string | null
}

export type ConvertedPartnershipDetails = {
  profile_id: string | null
  username: string | null
  profile_url: string | null
}

export type ConvertedPostContentItem = {
  index: number
  type: string | null
  url: string | null
  id: string | null
  alt_text: string | null
}

export type ConvertedAudio = {
  audio_asset_id: string | null
  original_audio_title: string | null
  username: string | null
  artist_id: string | null
}

export type ConvertedVideoDuration = {
  url: string | null
  video_duration: number
}

export type ConvertedImage = {
  url: string | null
  id: string | null
}

export type ConvertedPost = {
  url: string
  user_posted: string | null
  description: string | null
  hashtags: string[] | null
  num_comments: number
  shared: number
  saved: number
  date_posted: string | null
  photos: string[] | null
  videos: string[] | null
  latest_comments: ConvertedComment[] | null
  post_id: string | null
  shortcode: string | null
  content_type: string | null
  pk: string | null
  content_id: string | null
  engagement_score_view: number
  thumbnail: string | null
  video_view_count: number
  product_type: string | null
  tagged_users: ConvertedTaggedUser[] | null
  video_play_count: number
  followers: number
  posts_count: number
  profile_image_link: string | null
  is_verified: boolean | null
  is_paid_partnership: boolean | null
  partnership_details: ConvertedPartnershipDetails | null
  user_posted_id: string | null
  post_content: ConvertedPostContentItem[] | null
  audio: ConvertedAudio | null
  profile_url: string | null
  videos_duration: ConvertedVideoDuration[] | null
  images: ConvertedImage[] | null
  alt_text: string | null
  photos_number: number
  audio_url: string | null
  timestamp: string | null
  input: { url: string } | null
}

export type ClientWebhookPayload = {
  identifier: string | null
  date_scraped: string
  posts: ConvertedPost[]
  extras: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Incoming Phyllo payload
// ---------------------------------------------------------------------------

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

function toIsoString(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

/** Phyllo sends "video"; the client contract uses "Video". */
function toContentType(value: string | null | undefined): string | null {
  if (!value) return null
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildAudio(audio: PhylloVideo["audio"]): ConvertedAudio | null {
  if (!audio) return null
  return {
    audio_asset_id: audio.id ?? null,
    original_audio_title: audio.title ?? null,
    username: audio.author_name ?? null,
    artist_id: null,
  }
}

/**
 * Maps one Phyllo video. Returns `null` for anything without a `url`, mirroring
 * how the Instagram webhook drops unusable rows before converting.
 */
export function formatPhylloPost(input: unknown, scrapedAt: string): ConvertedPost | null {
  const parsed = phylloVideoSchema.safeParse(input)
  if (!parsed.success) return null

  const video = parsed.data
  const username = video.author_username ?? null
  const isVideo = (video.content_type ?? "video").toLowerCase() === "video"
  const media = video.media_urls?.length ? video.media_urls : null

  return {
    url: video.url,
    user_posted: username,
    description: video.caption ?? null,
    hashtags: video.hashtags?.length ? video.hashtags : null,
    num_comments: video.comment_count ?? 0,
    shared: video.share_count ?? 0,
    saved: video.save_count ?? 0,
    date_posted: toIsoString(video.timestamp),
    photos: isVideo ? null : media,
    videos: isVideo ? media : null,
    post_id: video.id ?? null,
    shortcode: video.id ?? null,
    content_type: toContentType(video.content_type),
    pk: video.id ?? null,
    content_id: video.id ?? null,
    thumbnail: video.thumbnail_url ?? null,
    video_view_count: video.view_count ?? 0,
    video_play_count: video.video_play_count ?? video.view_count ?? 0,
    followers: video.follower_count ?? 0,
    audio: buildAudio(video.audio),
    audio_url: video.audio?.play_url ?? null,
    profile_url: username ? `https://www.tiktok.com/@${username}` : null,
    videos_duration:
      isVideo && video.video_duration != null
        ? [{ url: video.url, video_duration: video.video_duration }]
        : null,
    timestamp: scrapedAt,
    input: { url: video.url },

    // Phyllo returns no equivalent — kept explicit so every key is always present.
    latest_comments: null,
    engagement_score_view: 0,
    product_type: null,
    tagged_users: null,
    posts_count: 0,
    profile_image_link: null,
    is_verified: null,
    is_paid_partnership: null,
    partnership_details: { profile_id: null, username: null, profile_url: null },
    user_posted_id: null,
    post_content: null,
    images: null,
    alt_text: null,
    photos_number: 0,
  }
}

export function formatPhylloPosts(input: unknown[], scrapedAt: string): ConvertedPost[] {
  return input
    .map((item) => formatPhylloPost(item, scrapedAt))
    .filter((post): post is ConvertedPost => post !== null)
}

/**
 * Builds the full body POSTed to a client webhook for a Phyllo result.
 * `identifier` is the hashtag the scrape request was made for.
 */
export function buildPhylloClientPayload({
  identifier,
  data,
  extras,
  dateScraped,
}: {
  identifier: string | null
  data: unknown[]
  extras: Record<string, unknown>
  dateScraped?: string | null
}): ClientWebhookPayload {
  const scrapedAt = toIsoString(dateScraped) ?? new Date().toISOString()
  return {
    identifier,
    date_scraped: scrapedAt,
    posts: formatPhylloPosts(data, scrapedAt),
    extras,
  }
}

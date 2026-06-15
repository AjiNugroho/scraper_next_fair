import type { InstagramPost_gd_lk5ns7kz21pck8jpis } from "@/types/intagram_posts_gd_lk5ns7kz21pck8jpis"

export type ConvertedInstagramPost = {
  url: string
  shortcode: string | null
  post_id: string | null
  user_posted: string | null
  user_posted_id: string | null
  description: string | null
  content_type: string | null
  date_posted: string | null
  likes: number | null
  num_comments: number
  hashtags: string[] | null
  photos: string[] | null
  videos: string[] | null
  thumbnail: string | null
  is_verified: boolean | null
  followers: number | null
  posts_count: number | null
  tagged_users: InstagramPost_gd_lk5ns7kz21pck8jpis["tagged_users"]
  is_paid_partnership: boolean | null
  partnership_details: InstagramPost_gd_lk5ns7kz21pck8jpis["partnership_details"]
  location: string[] | null
  timestamps: string | null
}

export type WebhookPayload = {
  account_name: string | null
  date_scraped: string
  posts: ConvertedInstagramPost[]
  extras: Record<string, unknown>
}

export function typeConverterV2(
  post: InstagramPost_gd_lk5ns7kz21pck8jpis,
): ConvertedInstagramPost {
  return {
    url: post.url,
    shortcode: post.shortcode ?? null,
    post_id: post.post_id ?? null,
    user_posted: post.user_posted ?? null,
    user_posted_id: post.user_posted_id ?? null,
    description: post.description ?? null,
    content_type: post.content_type ?? null,
    date_posted: post.date_posted ?? null,
    likes: post.likes ?? null,
    num_comments: post.num_comments ?? 0,
    hashtags: post.hashtags ?? null,
    photos: post.photos ?? null,
    videos: post.videos ?? null,
    thumbnail: post.thumbnail ?? null,
    is_verified: post.is_verified ?? null,
    followers: post.followers ?? null,
    posts_count: post.posts_count ?? null,
    tagged_users: post.tagged_users ?? null,
    is_paid_partnership: post.is_paid_partnership ?? null,
    partnership_details: post.partnership_details ?? null,
    location: post.location ?? null,
    timestamps: post.timestamps ?? null,
  }
}

// Beauty scraped videos share the TikTok results API and query cache, so deletes
// from either page keep both lists in sync.
export {
  useTiktokResults as useBeautyVideos,
  type TiktokVideoResult as BeautyVideo,
  type ListResultsOptions as ListBeautyVideosOptions,
} from "@/app/(dashboard)/tiktok/results/datahooks/useTiktokResults"

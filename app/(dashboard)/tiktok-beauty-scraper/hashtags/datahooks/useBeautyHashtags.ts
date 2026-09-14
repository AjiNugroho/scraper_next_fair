// Beauty hashtags share the TikTok hashtags API and query cache, so mutations
// from either page keep both lists in sync.
export {
  useTiktokHashtags as useBeautyHashtags,
  type TiktokHashtag as BeautyHashtag,
  type ListHashtagsOptions as ListBeautyHashtagsOptions,
} from "@/app/(dashboard)/tiktok/hashtags/datahooks/useTiktokHashtags"

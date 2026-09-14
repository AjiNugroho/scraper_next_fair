// Beauty scrape requests share the TikTok jobs API and query cache, so mutations
// from either page keep both lists in sync.
export {
  useTiktokJobs as useBeautyRequests,
  type TiktokJobRequest as BeautyRequest,
  type ListJobsOptions as ListBeautyRequestsOptions,
} from "@/app/(dashboard)/tiktok/jobs/datahooks/useTiktokJobs"

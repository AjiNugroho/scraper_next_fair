import cron from "node-cron"
import { runTiktokScrapeJob } from "@/lib/tiktok-scrape-job"

console.log("[scheduler] started — TikTok video scrape job runs every Sunday at 00:00")

// Every Sunday at 00:00
cron.schedule("0 0 * * 0", async () => {
  console.log("[scheduler] starting TikTok video scrape job")
  try {
    const result = await runTiktokScrapeJob()
    console.log(`[scheduler] done — ${result.batchesSent} batch(es), ${result.videoUrlsCount} URL(s) sent to Bright Data`)
  } catch (err) {
    console.error("[scheduler] job failed:", err)
  }
})

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BeautyDispatchRunsTable } from "./components/BeautyDispatchRunsTable"

export const dynamic = "force-dynamic"

export default function BeautyVideoDispatcherPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Beauty Video Dispatcher</CardTitle>
        <CardDescription>
          Dispatch collected TikTok video URLs to Phyllo Scraper. Results are delivered only to the
          scrape requests selected for each run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BeautyDispatchRunsTable />
      </CardContent>
    </Card>
  )
}

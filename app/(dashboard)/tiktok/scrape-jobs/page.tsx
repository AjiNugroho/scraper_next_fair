import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrapeJobsTable } from "./components/ScrapeJobsTable"

export const dynamic = "force-dynamic"

export default function ScrapeJobsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Item BrightData Scraper Job</CardTitle>
        <CardDescription>
          Trigger bright data blast jobs to scrape TikTok item pages based on the scrape requests received. This job runs every Sunday at 00:00.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrapeJobsTable />
      </CardContent>
    </Card>
  )
}

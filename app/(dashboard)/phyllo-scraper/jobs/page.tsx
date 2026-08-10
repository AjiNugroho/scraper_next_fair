import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhylloScrapeJobsTable } from "./components/PhylloScrapeJobsTable"

export const dynamic = "force-dynamic"

export default function PhylloScrapeJobsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Item Phyllo Scraper Job</CardTitle>
        <CardDescription>
          Trigger Phyllo scraper jobs to scrape TikTok item pages based on the scrape requests received.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhylloScrapeJobsTable />
      </CardContent>
    </Card>
  )
}

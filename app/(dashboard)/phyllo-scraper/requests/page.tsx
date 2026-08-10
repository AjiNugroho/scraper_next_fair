import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PhylloRequestsManagement } from "./components/PhylloRequestsManagement"

export default function PhylloScrapeRequestsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Phyllo Scrape Requests</CardTitle>
        <CardDescription>
          Hashtags scraped through the Phyllo pipeline. Only requests with a webhook URL are picked
          up by a Phyllo job run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhylloRequestsManagement />
      </CardContent>
    </Card>
  )
}

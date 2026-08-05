import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScraperTestsTable } from "./components/ScraperTestsTable"

export const dynamic = "force-dynamic"

export default function ScraperTestsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Scraper Tester</CardTitle>
        <CardDescription>
          Send a single video URL through the real Phyllo or Bright Data flow and inspect exactly
          what gets relayed to a client webhook — no hashtag request needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScraperTestsTable />
      </CardContent>
    </Card>
  )
}

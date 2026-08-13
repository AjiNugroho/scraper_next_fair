import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TokopediaWorkersManagement } from "./components/TokopediaWorkersManagement"

export default function TokopediaWorkersPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Tokopedia Workers</CardTitle>
        <CardDescription>
          Mobile scraper devices for the Tokopedia project. Hashtags submitted in Scrape Requests
          are rebalanced across these workers automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TokopediaWorkersManagement />
      </CardContent>
    </Card>
  )
}

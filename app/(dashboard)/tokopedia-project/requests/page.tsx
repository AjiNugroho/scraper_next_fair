import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TokopediaRequestsManagement } from "./components/TokopediaRequestsManagement"

export default function TokopediaRequestsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Gopay Scrape Requests</CardTitle>
        <CardDescription>
          Submit hashtags to scrape from Gopay. Results are delivered to the webhook URL
          configured via the TOKOPEDIA_WEBHOOK_URL environment variable — it cannot be set per
          request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TokopediaRequestsManagement />
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WebhookLogTable } from "./components/WebhookLogTable"

export default function WebhookLogPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Webhook Log</CardTitle>
      </CardHeader>
      <CardContent>
        <WebhookLogTable />
      </CardContent>
    </Card>
  )
}

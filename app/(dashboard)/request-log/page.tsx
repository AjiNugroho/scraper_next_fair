import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RequestLogTable } from "./components/RequestLogTable"

export default function RequestLogPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Request Log</CardTitle>
      </CardHeader>
      <CardContent>
        <RequestLogTable />
      </CardContent>
    </Card>
  )
}

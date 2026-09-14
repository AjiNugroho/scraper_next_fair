import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BeautyRequestsManagement } from "./components/BeautyRequestsManagement"

export default function BeautyRequestsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Beauty Scrape Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <BeautyRequestsManagement />
      </CardContent>
    </Card>
  )
}

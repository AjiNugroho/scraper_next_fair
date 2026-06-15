import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TiktokHashtagsManagement } from "./components/TiktokHashtagsManagement"

export default function TiktokHashtagsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Hashtags</CardTitle>
      </CardHeader>
      <CardContent>
        <TiktokHashtagsManagement />
      </CardContent>
    </Card>
  )
}

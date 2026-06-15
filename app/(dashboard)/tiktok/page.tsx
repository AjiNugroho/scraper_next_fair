import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TiktokWorkersManagement } from "./components/TiktokWorkersManagement"

export default function TiktokWorkersPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Workers</CardTitle>
      </CardHeader>
      <CardContent>
        <TiktokWorkersManagement />
      </CardContent>
    </Card>
  )
}

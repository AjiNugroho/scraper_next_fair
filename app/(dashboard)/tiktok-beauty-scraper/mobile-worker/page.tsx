import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TiktokWorkersManagement } from "@/app/(dashboard)/tiktok/components/TiktokWorkersManagement"

export default function BeautyMobileWorkersPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Beauty Workers</CardTitle>
      </CardHeader>
      <CardContent>
        <TiktokWorkersManagement />
      </CardContent>
    </Card>
  )
}

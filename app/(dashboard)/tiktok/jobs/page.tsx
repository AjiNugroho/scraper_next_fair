import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TiktokJobsManagement } from "./components/TiktokJobsManagement"

export default function TiktokJobsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <TiktokJobsManagement />
      </CardContent>
    </Card>
  )
}

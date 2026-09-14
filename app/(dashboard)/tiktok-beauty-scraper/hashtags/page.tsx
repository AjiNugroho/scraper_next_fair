import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BeautyHashtagsManagement } from "./components/BeautyHashtagsManagement"

export default function BeautyHashtagsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>TikTok Beauty Hashtags</CardTitle>
      </CardHeader>
      <CardContent>
        <BeautyHashtagsManagement />
      </CardContent>
    </Card>
  )
}

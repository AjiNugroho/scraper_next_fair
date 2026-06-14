import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InstagramTaggedManagement } from "./components/InstagramTaggedManagement"

export default function InstagramTaggedPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Instagram Tagged Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <InstagramTaggedManagement />
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TokopediaHashtagsManagement } from "./components/TokopediaHashtagsManagement"

export default function TokopediaHashtagsPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Gopay Hashtags</CardTitle>
        <CardDescription>
          Hashtags currently queued for scraping and the worker each is assigned to. Renaming or
          deleting here changes the live queue, not the original scrape request log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TokopediaHashtagsManagement />
      </CardContent>
    </Card>
  )
}

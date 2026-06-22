import { Card } from "@/components/ui/card"
import { BulkScrapeManagement } from "./components/BulkScrapeManagement"

export default function BulkScrapePage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <BulkScrapeManagement />
    </Card>
  )
}

import { db } from "@/db/drizzle"
import { tiktokHashtagVideoResult } from "@/db/tiktok-schema"
import { Card } from "@/components/ui/card"
import { ResultsTable } from "./components/ResultsTable"

export const dynamic = "force-dynamic"

export default async function TiktokResultsPage() {
  const rows = await db
    .selectDistinct({ hashtag: tiktokHashtagVideoResult.hashtag })
    .from(tiktokHashtagVideoResult)

  const hashtags = rows.map((r) => r.hashtag).sort()

  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <ResultsTable hashtags={hashtags} />
    </Card>
  )
}

import { db } from "@/db/drizzle"
import { tokopediaHashtagVideoResult } from "@/db/tokopedia-schema"
import { Card } from "@/components/ui/card"
import { ResultsTable } from "./components/ResultsTable"

export const dynamic = "force-dynamic"

export default async function TokopediaResultsPage() {
  const rows = await db
    .selectDistinct({ hashtag: tokopediaHashtagVideoResult.hashtag })
    .from(tokopediaHashtagVideoResult)

  const hashtags = rows.map((r) => r.hashtag).sort()

  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <ResultsTable hashtags={hashtags} />
    </Card>
  )
}

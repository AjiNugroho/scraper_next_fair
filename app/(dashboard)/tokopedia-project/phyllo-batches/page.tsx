import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhylloBatchesTable } from "./components/PhylloBatchesTable"

export const dynamic = "force-dynamic"

export default function TokopediaPhylloBatchesPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Gopay Phyllo Batches</CardTitle>
        <CardDescription>
          Every video URL a worker submits is dispatched to Phyllo automatically and grouped into
          a daily batch. Phyllo delivers results straight to the configured client webhook — use
          this page to check dispatch status and retry a batch&apos;s failed items.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhylloBatchesTable />
      </CardContent>
    </Card>
  )
}

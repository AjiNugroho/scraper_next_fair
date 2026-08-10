import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhylloTestsTable } from "./components/PhylloTestsTable"

export const dynamic = "force-dynamic"

export default function PhylloTesterPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Phyllo Tester</CardTitle>
        <CardDescription>
          Send a single video URL through the real Phyllo flow and inspect exactly what gets
          relayed to a client webhook — no scrape request needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhylloTestsTable />
      </CardContent>
    </Card>
  )
}

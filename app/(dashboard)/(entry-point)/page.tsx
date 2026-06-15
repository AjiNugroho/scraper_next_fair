import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkerStatusGrid } from "./components/WorkerStatusGrid"

export default function DashboardPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <WorkerStatusGrid />
      </CardContent>
    </Card>
  )
}

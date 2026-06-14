import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ApiKeyManagement } from "./components/ApiKeyManagement"

export default function ApiKeysPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Manage API keys for programmatic access. Keys are shown only once upon creation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ApiKeyManagement />
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserManagement } from "./components/UserManagement"

export default function AdminPage() {
  return (
    <Card className="bg-background border-none shadow-none ring-0">
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <UserManagement />
      </CardContent>
    </Card>
  )
}

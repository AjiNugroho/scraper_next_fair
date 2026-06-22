import { BulkJobDetail } from "./components/BulkJobDetail"

export default async function BulkJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BulkJobDetail id={id} />
}

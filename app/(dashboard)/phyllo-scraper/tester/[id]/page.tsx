import { PhylloTestDetail } from "./components/PhylloTestDetail"

export const dynamic = "force-dynamic"

export default async function PhylloTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PhylloTestDetail id={id} />
}

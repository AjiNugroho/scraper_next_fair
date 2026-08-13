import { PhylloBatchDetail } from "./components/PhylloBatchDetail"

export default async function TokopediaPhylloBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PhylloBatchDetail id={id} />
}

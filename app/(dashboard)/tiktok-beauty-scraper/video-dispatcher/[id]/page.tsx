import { BeautyDispatchRunDetail } from "./components/BeautyDispatchRunDetail"

export default async function BeautyDispatchRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BeautyDispatchRunDetail id={id} />
}

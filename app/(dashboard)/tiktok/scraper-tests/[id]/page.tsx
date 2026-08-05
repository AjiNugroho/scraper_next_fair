import { ScraperTestDetail } from "./components/ScraperTestDetail"

export const dynamic = "force-dynamic"

export default async function ScraperTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ScraperTestDetail id={id} />
}

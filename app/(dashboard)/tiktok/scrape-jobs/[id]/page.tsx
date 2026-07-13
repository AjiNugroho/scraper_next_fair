import { ScrapeJobRunDetail } from "./components/ScrapeJobRunDetail"

export default async function ScrapeJobRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ScrapeJobRunDetail id={id} />
}

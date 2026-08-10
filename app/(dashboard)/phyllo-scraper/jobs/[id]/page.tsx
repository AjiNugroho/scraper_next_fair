import { PhylloScrapeJobRunDetail } from "./components/PhylloScrapeJobRunDetail"

export default async function PhylloScrapeJobRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PhylloScrapeJobRunDetail id={id} />
}

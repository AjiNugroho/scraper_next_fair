"use client"

import { ScraperTestDetail as ScraperTestDetailView } from "@/components/scraper-test/ScraperTestDetail"
import { useScraperTest } from "../../datahooks/useScraperTests"

export function ScraperTestDetail({ id }: { id: string }) {
  const { data, isLoading, isError } = useScraperTest(id)

  return (
    <ScraperTestDetailView
      run={data?.run}
      isLoading={isLoading}
      isError={isError}
      backHref="/tiktok/scraper-tests"
      backLabel="Back to Scraper Tests"
    />
  )
}

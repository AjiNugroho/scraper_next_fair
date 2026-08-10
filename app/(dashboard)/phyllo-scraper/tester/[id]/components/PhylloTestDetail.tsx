"use client"

import { ScraperTestDetail } from "@/components/scraper-test/ScraperTestDetail"
import { usePhylloTest } from "../../datahooks/usePhylloTests"

export function PhylloTestDetail({ id }: { id: string }) {
  const { data, isLoading, isError } = usePhylloTest(id)

  return (
    <ScraperTestDetail
      run={data?.run}
      isLoading={isLoading}
      isError={isError}
      backHref="/phyllo-scraper/tester"
      backLabel="Back to Phyllo Tester"
    />
  )
}

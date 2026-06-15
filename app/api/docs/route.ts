import { ApiReference } from "@scalar/nextjs-api-reference"

export const GET = ApiReference({
  spec: { url: "/api/docs/openapi.json" },
  pageTitle: "Scraper API Reference",
})

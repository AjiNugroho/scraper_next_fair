import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const docsDir = path.join(process.cwd(), "docs")

function readDoc(filename: string): string {
  try {
    return fs.readFileSync(path.join(docsDir, filename), "utf-8")
  } catch {
    return ""
  }
}

const tiktokJobSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    listenGroupId: { type: "integer", nullable: true },
    requestDataId: { type: "integer", nullable: true },
    hashtag: { type: "string" },
    webhookUrl: { type: "string", nullable: true },
    extras: { type: "object", additionalProperties: true, nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "hashtag", "createdAt"],
}

const instagramDoc = readDoc("instagram-scraper-flow.md")
const tiktokDoc = readDoc("tiktok-scraper-flow.md")

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Scraper Client API",
    version: "1.0.0",
    description:
      "Client-facing API for submitting Instagram and TikTok scraper jobs. All endpoints require an `x-api-key` header.",
  },
  servers: [{ url: "/api/v1/client", description: "Production" }],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: "Instagram", description: instagramDoc },
    { name: "TikTok Jobs", description: tiktokDoc },
    { name: "TikTok Video Scraper" },
    { name: "Webhooks" },
    { name: "Helpers" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API key issued from the dashboard.",
      },
    },
    schemas: {
      TiktokJob: tiktokJobSchema,
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
    },
  },
  paths: {
    "/tiktok-video-scrape": {
      post: {
        summary: "Submit a TikTok video scrape request (test endpoint)",
        operationId: "tiktokVideoScrapeCreate",
        tags: ["TikTok Video Scraper"],
        description:
          "Publishes a `tiktok.scrape_video` Celery task to the `tiktok_videos_scraper` RabbitMQ queue. The `worker_tiktok_item` Celery worker picks it up, scrapes the video URL with a headless browser, and POSTs the result to `webhook_url`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["request_id", "url", "webhook_url"],
                properties: {
                  request_id: {
                    type: "string",
                    minLength: 1,
                    description: "Caller-supplied identifier echoed back in the response and forwarded to the worker.",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                    description: "TikTok video URL to scrape (e.g. `https://www.tiktok.com/@user/video/123456`).",
                  },
                  webhook_url: {
                    type: "string",
                    format: "uri",
                    description: "URL the worker will POST results to when scraping is done.",
                  },
                  extras: {
                    type: "object",
                    additionalProperties: true,
                    description: "Optional free-form metadata forwarded as-is to the worker and included in the webhook payload.",
                  },
                },
              },
              example: {
                request_id: "test-run-001",
                url: "https://www.tiktok.com/@someuser/video/7650168556616895765",
                webhook_url: "https://your-service.com/webhook/result",
                extras: { campaign: "summer2026", hashtags: ["#viral"] },
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Task queued. The worker will call `webhook_url` asynchronously with the result.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    request_id: { type: "string" },
                    status: { type: "string", enum: ["queued"] },
                  },
                },
                example: { request_id: "test-run-001", status: "queued" },
              },
            },
          },
          "400": { description: "Validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "502": { description: "Request valid but could not be queued (RabbitMQ unavailable).", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/tiktok-results": {
      post: {
        summary: "Submit TikTok scrape results",
        operationId: "tiktokResultsCreate",
        tags: ["TikTok Jobs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["worker_name", "hashtag", "video_urls"],
                properties: {
                  worker_name: { type: "string", minLength: 1, description: "Name of the mobile worker submitting results." },
                  hashtag: { type: "string", minLength: 1, description: "Hashtag that was scraped (no # prefix)." },
                  video_urls: {
                    type: "array",
                    items: { type: "string", format: "uri" },
                    description: "List of collected TikTok video URLs. Can be empty if the page yielded no results.",
                  },
                },
              },
              example: {
                worker_name: "worker-01",
                hashtag: "savearth",
                video_urls: [
                  "https://www.tiktok.com/@someuser/video/7650168556616895765",
                  "https://www.tiktok.com/@anotheruser/video/7650168556616895766",
                ],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Results saved.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    saved: { type: "integer", description: "Number of video URLs inserted." },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/expand-url": {
      post: {
        summary: "Expand a shortened TikTok URL",
        operationId: "expandUrl",
        tags: ["Helpers"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url"],
                properties: {
                  url: { type: "string", format: "uri", description: "Shortened or redirecting TikTok URL to expand." },
                },
              },
              example: { url: "https://vm.tiktok.com/ZMxxxxxx/" },
            },
          },
        },
        responses: {
          "200": {
            description: "Expanded URL (query string stripped).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string", format: "uri" } },
                },
              },
            },
          },
          "400": { description: "No redirect found or URL is invalid.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/instagram-tagged": {
      post: {
        summary: "Submit Instagram tagged scrape request",
        operationId: "instagramTaggedCreate",
        tags: ["Instagram"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: {
                  webhook_url: {
                    type: "string",
                    format: "uri",
                    description: "URL to receive the scrape results via POST when done.",
                  },
                  extras: {
                    type: "object",
                    additionalProperties: true,
                    description: "Arbitrary key-value metadata forwarded with the job.",
                  },
                  data: {
                    type: "array",
                    minItems: 1,
                    maxItems: 50,
                    items: {
                      type: "object",
                      required: ["identifier", "data_size"],
                      properties: {
                        identifier: {
                          type: "string",
                          minLength: 1,
                          description: "Instagram hashtag or identifier to scrape.",
                        },
                        data_size: {
                          type: "number",
                          minimum: 1,
                          description: "Number of posts to collect.",
                        },
                        date_start: {
                          type: "string",
                          description: "Collect posts on or after this date (ISO 8601).",
                        },
                        date_end: {
                          type: "string",
                          description: "Collect posts on or before this date (ISO 8601).",
                        },
                      },
                    },
                  },
                },
              },
              example: {
                webhook_url: "https://example.com/webhook",
                data: [
                  { identifier: "savearth", data_size: 100, date_start: "2024-01-01" },
                ],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Request queued successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    request_id: { type: "string", format: "uuid" },
                    sent_messages: { type: "integer" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "502": { description: "Request saved but could not be queued (RabbitMQ unavailable).", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/tiktok-jobs": {
      get: {
        summary: "List TikTok jobs",
        operationId: "tiktokJobsList",
        tags: ["TikTok Jobs"],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
            description: "Max number of results to return (capped at 100).",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
            description: "Number of results to skip.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of jobs.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobs: { type: "array", items: { $ref: "#/components/schemas/TiktokJob" } },
                    total: { type: "integer" },
                    limit: { type: "integer" },
                    offset: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        summary: "Submit TikTok job batch",
        operationId: "tiktokJobsCreate",
        tags: ["TikTok Jobs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: {
                  webhook_url: {
                    type: "string",
                    description: "Webhook URL to notify when results are ready.",
                  },
                  extras: {
                    type: "object",
                    additionalProperties: true,
                    description:
                      "Arbitrary metadata. `listen_group_id` (integer) and `request_data_id` (integer) inside `extras` are extracted and stored in dedicated columns.",
                    properties: {
                      listen_group_id: { type: "integer", description: "Listen group identifier." },
                      request_data_id: { type: "integer", description: "Request data identifier." },
                    },
                  },
                  data: {
                    type: "array",
                    minItems: 1,
                    maxItems: 50,
                    items: {
                      type: "object",
                      required: ["identifier"],
                      properties: {
                        identifier: {
                          type: "string",
                          minLength: 1,
                          description: "Hashtag to scrape (no # prefix).",
                        },
                        date_start: {
                          type: "string",
                          description: "Start date filter (ISO 8601).",
                        },
                        date_end: {
                          type: "string",
                          description: "End date filter (ISO 8601).",
                        },
                        data_size: {
                          type: "integer",
                          description: "Number of videos to collect.",
                        },
                      },
                    },
                  },
                },
              },
              example: {
                webhook_url: "https://example.com/webhook",
                extras: { listen_group_id: 1, request_data_id: 42 },
                data: [
                  { identifier: "savearth", date_start: "2024-01-01", date_end: "2024-01-31", data_size: 200 },
                  { identifier: "nature" },
                ],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Jobs created and hashtag pool rebalanced.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    jobs: { type: "array", items: { $ref: "#/components/schemas/TiktokJob" } },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/webhooks/tiktok/hashtag": {
      post: {
        summary: "Bright Data results callback (TikTok hashtag)",
        operationId: "tiktokHashtagWebhook",
        tags: ["Webhooks"],
        description:
          "Called by Bright Data when a TikTok video scrape batch is complete. Pass `?request_id=<uuid>` so the system can look up the originating job and forward results to the client webhook. One trigger call = one webhook hit; multiple batches for the same request produce multiple hits.",
        parameters: [
          {
            name: "request_id",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the `tiktok_hashtag_request` row that triggered this scrape.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { type: "object", additionalProperties: true },
                description: "Array of scraped TikTok video objects as returned by Bright Data.",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Received and forwarded.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    received: { type: "integer", description: "Number of items in the payload." },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid JSON body.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
        security: [],
      },
    },
    "/tiktok-jobs/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Worker name (e.g. `brown-bear-44723`). For GET: used to look up the worker. For PATCH/DELETE: job UUID.",
        },
      ],
      get: {
        summary: "Get hashtags assigned to a worker",
        operationId: "tiktokJobsGetWorkerHashtags",
        tags: ["TikTok Jobs"],
        description: "Returns the list of hashtags currently assigned to the given worker. Returns 404 if the worker name is not registered.",
        responses: {
          "200": {
            description: "Assigned hashtags.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    hashtags: {
                      type: "array",
                      items: { type: "string" },
                      description: "Hashtags assigned to this worker (no # prefix).",
                    },
                  },
                },
                example: { hashtags: ["savearth", "nature", "wildlife"] },
              },
            },
          },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Worker not registered.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        summary: "Update a TikTok job",
        operationId: "tiktokJobsUpdate",
        tags: ["TikTok Jobs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  webhook_url: { type: "string", nullable: true, description: "New webhook URL (null to clear)." },
                  extras: { type: "object", additionalProperties: true, nullable: true, description: "Replace extras object (null to clear)." },
                  listen_group_id: { type: "integer", nullable: true, description: "Listen group ID (null to clear)." },
                  request_data_id: { type: "integer", nullable: true, description: "Request data ID (null to clear)." },
                },
                minProperties: 1,
              },
              example: { webhook_url: "https://example.com/new-webhook", listen_group_id: null },
            },
          },
        },
        responses: {
          "200": {
            description: "Job updated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    job: { $ref: "#/components/schemas/TiktokJob" },
                  },
                },
              },
            },
          },
          "400": { description: "No fields provided or validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Job not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        summary: "Delete a TikTok job",
        operationId: "tiktokJobsDelete",
        tags: ["TikTok Jobs"],
        responses: {
          "200": {
            description: "Job deleted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
          "401": { description: "Missing or invalid API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Job not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
}

export function GET() {
  return NextResponse.json(spec)
}

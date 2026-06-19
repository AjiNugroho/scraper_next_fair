/**
 * Publishes messages to RabbitMQ via the Management HTTP API.
 * No native AMQP library required — uses plain fetch.
 *
 * Required env vars:
 *   RABBITMQ_URL              — amqp://user:pass@host:5672/vhost  (credentials parsed from here)
 *   RABBITMQ_HTTP_PUBLISH_URL — full URL to POST to, e.g.
 *                               http://your-management-host/api/exchanges/%2F/amq.default/publish
 *   REQUEST_QUEUE_NAME        — name of the target queue
 */

export type InstagramTaggedItem = {
  identifier: string
  data_size: number
  date_start?: string
  date_end?: string
}

function getPublishConfig() {
  const amqpUrl = process.env.RABBITMQ_URL
  if (!amqpUrl) throw new Error("RABBITMQ_URL is not set")

  const parsed = new URL(amqpUrl)
  const username = decodeURIComponent(parsed.username)
  const password = decodeURIComponent(parsed.password)

  const publishUrl = process.env.RABBITMQ_HTTP_PUBLISH_URL
  if (!publishUrl) throw new Error("RABBITMQ_HTTP_PUBLISH_URL is not set")

  const queueName = process.env.REQUEST_QUEUE_NAME
  if (!queueName) throw new Error("REQUEST_QUEUE_NAME is not set")

  return { username, password, publishUrl, queueName }
}

async function publishRaw(payloadStr: string): Promise<void> {
  const { username, password, publishUrl, queueName } = getPublishConfig()

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    },
    body: JSON.stringify({
      properties: {
        delivery_mode: 2,
        content_type: "application/json",
      },
      routing_key: queueName,
      payload: payloadStr,
      payload_encoding: "string",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RabbitMQ publish failed [${res.status}]: ${text}`)
  }

  const result = (await res.json()) as { routed: boolean }
  if (!result.routed) {
    throw new Error(`Message was not routed — queue "${queueName}" may not exist yet`)
  }
}

/**
 * Publishes a Celery-format task message to RabbitMQ.
 * Body format: [[], {kwargs}, {}]  (Celery protocol v1)
 * Headers carry the task name and a generated task ID.
 */
async function publishCeleryTask({
  taskName,
  queue,
  taskId,
  kwargs,
}: {
  taskName: string
  queue: string
  taskId: string
  kwargs: Record<string, unknown>
}): Promise<void> {
  const { username, password, publishUrl } = getPublishConfig()

  const body = JSON.stringify([[], kwargs, {}])

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    },
    body: JSON.stringify({
      properties: {
        delivery_mode: 2,
        content_type: "application/json",
        content_encoding: "utf-8",
        headers: {
          task: taskName,
          id: taskId,
          lang: "py",
          retries: 0,
          eta: null,
          expires: null,
          utc: true,
          callbacks: null,
          errbacks: null,
          timelimit: [null, null],
          root_id: taskId,
          parent_id: null,
          group: null,
        },
      },
      routing_key: queue,
      payload: body,
      payload_encoding: "string",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RabbitMQ publish failed [${res.status}]: ${text}`)
  }

  const result = (await res.json()) as { routed: boolean }
  if (!result.routed) {
    throw new Error(`Message was not routed — queue "${queue}" may not exist yet`)
  }
}

export async function publishTiktokVideoScrape({
  taskId,
  requestId,
  url,
  webhookUrl,
  extras,
}: {
  taskId: string
  requestId: string
  url: string
  webhookUrl: string
  extras?: Record<string, unknown>
}): Promise<void> {
  await publishCeleryTask({
    taskName: "tiktok.scrape_video",
    queue: "tiktok_videos_scraper",
    taskId,
    kwargs: {
      request_id: requestId,
      url,
      webhook_url: webhookUrl,
      extras: extras ?? {},
    },
  })
}

/**
 * Publishes one RabbitMQ message per item in parallel, matching the worker contract:
 *   { task: "run_instagram_listing_scraper", args: [{ url, max_item, webhook_endpoint }] }
 */
export async function publishInstagramTaggedItems({
  items,
  webhookUrl,
  extras,
  requestId,
}: {
  items: InstagramTaggedItem[]
  webhookUrl?: string
  extras?: Record<string, unknown>
  requestId: string
}): Promise<void> {
  const appUrl = process.env.APP_BASE_URL
  if (!appUrl) throw new Error("APP_BASE_URL is not set")

  const extrasEncoded = encodeURIComponent(JSON.stringify(extras ?? {}))

  const publishes = items.map((item) => {
    const taggedUrl = `https://www.instagram.com/${item.identifier}/tagged`

    const webhookEndpoint =
      `${appUrl}/api/webhooks/instagram/tagged` +
      `?request_id=${encodeURIComponent(requestId)}` +
      `&account_name=${encodeURIComponent(item.identifier)}` +
      `&client_webhook=${encodeURIComponent(webhookUrl ?? "")}` +
      `&extras=${extrasEncoded}`

    const payload = JSON.stringify({
      task: "run_instagram_listing_scraper",
      args: [
        {
          url: taggedUrl,
          max_item: item.data_size,
          webhook_endpoint: webhookEndpoint,
        },
      ],
    })

    return publishRaw(payload)
  })

  await Promise.all(publishes)
}

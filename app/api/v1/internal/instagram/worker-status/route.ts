import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { error: null }
}

type RabbitQueueInfo = {
  consumers: number
  messages: number
}

async function fetchQueueInfo(
  baseUrl: string,
  vhost: string,
  queueName: string,
  credentials: string,
): Promise<RabbitQueueInfo> {
  const encodedVhost = encodeURIComponent(vhost)
  const encodedQueue = encodeURIComponent(queueName)
  const url = `${baseUrl}/api/queues/${encodedVhost}/${encodedQueue}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    throw new Error(`RabbitMQ returned ${res.status} for queue "${queueName}"`)
  }

  const data = await res.json() as { consumers: number; messages: number }
  return { consumers: data.consumers ?? 0, messages: data.messages ?? 0 }
}

export async function GET(req: NextRequest) {
  const { error } = await requireSession(req)
  if (error) return error

  const rabbitmqUrl = process.env.RABBITMQ_URL
  const managementUrl = process.env.RABBITMQ_MANAGEMENT_URL
  const requestQueue = process.env.IG_SCRAPER_REQUEST_QUEUE
  const responseQueue = process.env.IG_SCRAPER_RESPONSE_QUEUE

  if (!rabbitmqUrl || !managementUrl || !requestQueue || !responseQueue) {
    return NextResponse.json(
      { error: "RabbitMQ not configured" },
      { status: 503 },
    )
  }

  // Parse credentials and vhost from amqp:// URL
  const amqp = new URL(rabbitmqUrl)
  const user = decodeURIComponent(amqp.username)
  const pass = decodeURIComponent(amqp.password)
  // vhost is the pathname (e.g. "/" or "/myvhost")
  const vhost = decodeURIComponent(amqp.pathname.slice(1)) || "/"

  // Management base is just the origin of the existing management URL
  const managementBase = new URL(managementUrl).origin

  const credentials = Buffer.from(`${user}:${pass}`).toString("base64")

  const [requestResult, responseResult] = await Promise.allSettled([
    fetchQueueInfo(managementBase, vhost, requestQueue, credentials),
    fetchQueueInfo(managementBase, vhost, responseQueue, credentials),
  ])

  return NextResponse.json({
    queues: {
      request: {
        name: requestQueue,
        ...(requestResult.status === "fulfilled"
          ? requestResult.value
          : { consumers: null, messages: null, error: requestResult.reason?.message }),
      },
      response: {
        name: responseQueue,
        ...(responseResult.status === "fulfilled"
          ? responseResult.value
          : { consumers: null, messages: null, error: responseResult.reason?.message }),
      },
    },
  })
}

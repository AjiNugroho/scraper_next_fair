import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendTelegram } from "@/lib/telegram"

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

// Per-process cooldown — prevents Telegram spam when the worker stays down across multiple polls
const ONE_HOUR = 60 * 60 * 1000
let lastNotifiedAt = 0

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

  const amqp = new URL(rabbitmqUrl)
  const user = decodeURIComponent(amqp.username)
  const pass = decodeURIComponent(amqp.password)
  const vhost = decodeURIComponent(amqp.pathname.slice(1)) || "/"
  const managementBase = new URL(managementUrl).origin
  const credentials = Buffer.from(`${user}:${pass}`).toString("base64")

  const [requestResult, responseResult] = await Promise.allSettled([
    fetchQueueInfo(managementBase, vhost, requestQueue, credentials),
    fetchQueueInfo(managementBase, vhost, responseQueue, credentials),
  ])

  const requestInfo = requestResult.status === "fulfilled" ? requestResult.value : null
  const responseInfo = responseResult.status === "fulfilled" ? responseResult.value : null

  const inactiveQueues: string[] = []
  if (requestInfo?.consumers === 0) inactiveQueues.push(requestQueue)
  if (responseInfo?.consumers === 0) inactiveQueues.push(responseQueue)

  if (inactiveQueues.length > 0 && Date.now() - lastNotifiedAt > ONE_HOUR) {
    lastNotifiedAt = Date.now()

    const lines = inactiveQueues.map((q) => {
      const info = q === requestQueue ? requestInfo : responseInfo
      return `• <b>${q}</b> — ${info?.messages ?? 0} messages waiting`
    })

    await sendTelegram(
      `🔴 <b>Instagram worker inactive</b>\n\n${lines.join("\n")}\n\n<i>${new Date().toUTCString()}</i>`,
    ).catch(() => {/* don't let Telegram failure affect the response */})
  }

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

import { db } from "@/db/drizzle"
import { tiktokWorker, tiktokJobHashtag, tiktokWorkerHashtagTask } from "@/db/tiktok-schema"
import { asc } from "drizzle-orm"

export async function rebalance(): Promise<void> {
  const [workers, hashtags] = await Promise.all([
    db.select().from(tiktokWorker).orderBy(asc(tiktokWorker.createdAt)),
    db.select({ id: tiktokJobHashtag.id }).from(tiktokJobHashtag).orderBy(asc(tiktokJobHashtag.createdAt)),
  ])

  await db.transaction(async (tx) => {
    await tx.delete(tiktokWorkerHashtagTask)

    if (workers.length === 0 || hashtags.length === 0) return

    const assignments = hashtags.map((h, i) => ({
      workerId: workers[i % workers.length].id,
      hashtagId: h.id,
    }))

    await tx.insert(tiktokWorkerHashtagTask).values(assignments)
  })
}

import { db } from "@/db/drizzle"
import { tokopediaWorker, tokopediaJobHashtag, tokopediaWorkerHashtagTask } from "@/db/tokopedia-schema"
import { asc } from "drizzle-orm"

export async function rebalance(): Promise<void> {
  const [workers, hashtags] = await Promise.all([
    db.select().from(tokopediaWorker).orderBy(asc(tokopediaWorker.createdAt)),
    db
      .select({ id: tokopediaJobHashtag.id })
      .from(tokopediaJobHashtag)
      .orderBy(asc(tokopediaJobHashtag.createdAt)),
  ])

  await db.transaction(async (tx) => {
    await tx.delete(tokopediaWorkerHashtagTask)

    if (workers.length === 0 || hashtags.length === 0) return

    const assignments = hashtags.map((h, i) => ({
      workerId: workers[i % workers.length].id,
      hashtagId: h.id,
    }))

    await tx.insert(tokopediaWorkerHashtagTask).values(assignments)
  })
}

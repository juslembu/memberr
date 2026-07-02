import { db } from '../db/client.js'
import { serverSettings } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const [row] = await db.select({ value: serverSettings.value }).from(serverSettings).where(eq(serverSettings.key, key)).limit(1)
  return row?.value ?? defaultValue
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(serverSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: serverSettings.key, set: { value, updatedAt: new Date() } })
}

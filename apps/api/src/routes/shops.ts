import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { predefinedShops } from '../db/schema.js'
import { asc } from 'drizzle-orm'

export default async function shopRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.select().from(predefinedShops).orderBy(asc(predefinedShops.name))
  })
}

import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import path from 'path'
import * as argon2 from 'argon2'
import * as schema from './schema.js'

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })

  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') })
  console.log('Migrations complete')

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, 'admin'))
    .limit(1)

  if (!existing) {
    const passwordHash = await argon2.hash('admin')
    await db.insert(schema.users).values({
      email: 'admin@memberr.local',
      username: 'admin',
      passwordHash,
      isAdmin: true,
      mustChangePassword: true,
    })
    console.log('Admin user seeded (admin / admin) — change password on first login')
  }

  await pool.end()
}

runMigrations().catch((err) => {
  console.error('Migration failed', err)
  process.exit(1)
})

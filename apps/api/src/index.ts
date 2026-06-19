import './config.js'
import { config } from './config.js'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import cardRoutes from './routes/cards.js'
import shareRoutes from './routes/shares.js'
import invitationRoutes from './routes/invitations.js'
import sharedWithMeRoutes from './routes/shared-with-me.js'
import shopRoutes from './routes/shops.js'
import adminRoutes from './routes/admin.js'
import publicShareRoutes from './routes/public-shares.js'
import cardOrderRoutes from './routes/card-order.js'

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

async function start() {
  await app.register(fastifyCookie)
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  })
  await app.register(fastifyHelmet, { contentSecurityPolicy: false })
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(authPlugin)

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(cardRoutes, { prefix: '/api/v1/cards' })
  await app.register(shareRoutes, { prefix: '/api/v1/cards' })
  await app.register(invitationRoutes, { prefix: '/api/v1/invitations' })
  await app.register(sharedWithMeRoutes, { prefix: '/api/v1/shared-with-me' })
  await app.register(shopRoutes, { prefix: '/api/v1/shops' })
  await app.register(adminRoutes, { prefix: '/api/v1/admin' })
  await app.register(publicShareRoutes, { prefix: '/api/v1' })
  await app.register(cardOrderRoutes, { prefix: '/api/v1/card-order' })

  app.get('/health', { config: { public: true } }, () => ({ ok: true }))

  await app.listen({ port: config.PORT, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})

import { FastifyInstance } from 'fastify'
import { readFileSync } from 'fs'
import { join } from 'path'

const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')) as { version: string }

export default async function versionRoutes(app: FastifyInstance) {
  app.get('/', { config: { public: true } }, async () => ({
    serverVersion: pkg.version,
    minAppVersion: process.env.MIN_APP_VERSION ?? '1.0.0',
  }))
}

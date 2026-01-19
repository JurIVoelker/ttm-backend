import { Hono } from 'hono'
import { showRoutes } from 'hono/dev'
import { cors } from 'hono/cors'
import { authController } from './controller/auth-controller'
import { matchController } from './controller/match-controller'
import { teamController } from './controller/team-controller'
import { leaderController } from './controller/leader-controller'
import { playerController } from './controller/player-controller'
import { adminController } from './controller/admin-controller'
import { loggerMiddleware } from './lib/logger'

export const app = new Hono().basePath("/api")
app.use(loggerMiddleware)

app.use(
  '/*',
  cors({
    origin: 'http://localhost:3000', // TODO adjust for production
    allowMethods: ['GET', 'POST', 'OPTIONS', "DELETE"],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

app.get("/health", (c) => c.json({ status: "ok" }))
app.route('/auth', authController)
app.route("/", matchController)
app.route("/", teamController)
app.route("/", leaderController)
app.route("/", playerController)
app.route("/", adminController)


showRoutes(app, {
  colorize: true,
})

export default {
  port: 8080,
  fetch: app.fetch,
}

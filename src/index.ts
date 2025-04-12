import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { userRouter } from './routes/user'
import { blogRouter } from './routes/blog'
import { errorHandler } from './middleware/errorHandler'

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string
  }
}>()

// Middleware
app.use('*', cors())
app.onError(errorHandler)

// Routes
app.route("/api/v1/user", userRouter)
app.route("/api/v1/blog", blogRouter)

export default app
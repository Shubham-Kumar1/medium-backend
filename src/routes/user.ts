import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { signupInput, signinInput, updateUserInput } from '../validations'
import { errorHandler } from '../middleware/errorHandler'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

export const userRouter = new Hono<{
    Bindings: {
      DATABASE_URL: string,
      JWT_SECRET: string
    }
}>()

userRouter.post('/signup', async (c) => {
    try {
        const body = await c.req.json()
        const validatedData = signupInput.parse(body)
        
        const pool = new Pool({ connectionString: c.env.DATABASE_URL })
        const adapter = new PrismaPg(pool as any)
        const prisma = new PrismaClient().$extends(withAccelerate())

        const hashedPassword = await bcrypt.hash(validatedData.password, 10)
        const user = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword
            }
        })

        const jwt = await sign({
            id: user.id
        }, c.env.JWT_SECRET)

        return c.json({
            message: "User Created Successfully",
            token: jwt
        })
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

userRouter.post('/signin', async (c) => {
    try {
        const body = await c.req.json()
        const validatedData = signinInput.parse(body)
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const user = await prisma.user.findUnique({
            where: {
                email: validatedData.email
            }
        })

        if (!user) {
            throw new HTTPException(401, { message: "Invalid credentials" })
        }

        const validPassword = await bcrypt.compare(validatedData.password, user.password)
        if (!validPassword) {
            throw new HTTPException(401, { message: "Invalid credentials" })
        }

        const jwt = await sign({
            id: user.id
        }, c.env.JWT_SECRET)

        return c.json({
            message: "User Signed in Successfully",
            token: jwt
        })
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

userRouter.get('/me', async (c) => {
    try {
        const authHeader = c.req.header("authorization") || ""
        const user = await verify(authHeader, c.env.JWT_SECRET) as { id: string }

        if (!user) {
            throw new HTTPException(401, { message: "Unauthorized" })
        }

        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const userData = await prisma.user.findUnique({
            where: {
                id: user.id
            },
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                image: true,
                _count: {
                    select: {
                        posts: true,
                        likes: true,
                        comments: true
                    }
                }
            }
        })

        if (!userData) {
            throw new HTTPException(404, { message: "User not found" })
        }

        return c.json(userData)
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

userRouter.put('/me', async (c) => {
    try {
        const authHeader = c.req.header("authorization") || ""
        const user = await verify(authHeader, c.env.JWT_SECRET) as { id: string }

        if (!user) {
            throw new HTTPException(401, { message: "Unauthorized" })
        }

        const body = await c.req.json()
        const validatedData = updateUserInput.parse(body)
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const updatedUser = await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                name: validatedData.name,
                bio: validatedData.bio,
                image: validatedData.image
            },
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                image: true
            }
        })

        return c.json(updatedUser)
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

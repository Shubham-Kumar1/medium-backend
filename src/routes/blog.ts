import { Hono } from "hono";
import { PrismaClient } from '@prisma/client'
import { decode, sign, verify } from 'hono/jwt'
import { createPostInput, updatePostInput, createCommentInput, paginationInput } from '../validations'
import { errorHandler } from '../middleware/errorHandler'
import { HTTPException } from 'hono/http-exception'

export const blogRouter = new Hono<{
    Bindings: {
      DATABASE_URL: string,
      JWT_SECRET: string
    },
    Variables: {
        userId: string
    }
}>()

blogRouter.use("/*",async (c,next) => {
    const authHeader = c.req.header("authorization") || ""
    const user = await verify(authHeader, c.env.JWT_SECRET) as { id: string }

    if (user) {
        c.set("userId", user.id)
        await next()
    } else {
        c.status(403)
        return c.json({
            message: "Please log in to continue"
        })
    }
})

// Create post
blogRouter.post('/', async(c) => {
    try {
        const body = await c.req.json()
        const validatedData = createPostInput.parse(body)
        const authorId = c.get("userId")
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const post = await prisma.post.create({
            data: {
                title: validatedData.title,
                content: validatedData.content,
                isPrivate: validatedData.isPrivate || false,
                authorId: authorId,
                images: validatedData.imageUrls ? {
                    create: validatedData.imageUrls.map(url => ({ url }))
                } : undefined,
                tags: validatedData.tags ? {
                    connectOrCreate: validatedData.tags.map(tag => ({
                        where: { name: tag },
                        create: { name: tag }
                    }))
                } : undefined
            },
            include: {
                images: true,
                tags: true
            }
        })
        return c.json(post)
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

// Update post
blogRouter.put('/:id', async (c) => {
    try {
        const id = c.req.param("id")
        const body = await c.req.json()
        const validatedData = updatePostInput.parse(body)
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const post = await prisma.post.update({
            where: {
                id: id,
                authorId: c.get("userId")
            },
            data: {
                title: validatedData.title,
                content: validatedData.content,
                isPrivate: validatedData.isPrivate,
                images: validatedData.imageUrls ? {
                    deleteMany: {},
                    create: validatedData.imageUrls.map(url => ({ url }))
                } : undefined,
                tags: validatedData.tags ? {
                    set: [],
                    connectOrCreate: validatedData.tags.map(tag => ({
                        where: { name: tag },
                        create: { name: tag }
                    }))
                } : undefined
            },
            include: {
                images: true,
                tags: true
            }
        })
        return c.json(post)
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

// Get single post
blogRouter.get('/:id', async (c) => {
    try {
        const id = c.req.param("id")
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const post = await prisma.post.findFirst({
            where: {
                id: id,
                OR: [
                    { isPrivate: false },
                    { authorId: c.get("userId") }
                ]
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                images: true,
                tags: true,
                likes: true,
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                }
            }
        })

        if (!post) {
            throw new HTTPException(404, { message: "Post not found" })
        }

        return c.json(post)
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

// Get all posts with pagination
blogRouter.get('/', async (c) => {
    try {
        const { page, limit } = paginationInput.parse({
            page: parseInt(c.req.query('page') || '1'),
            limit: parseInt(c.req.query('limit') || '10')
        })

        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where: {
                    OR: [
                        { isPrivate: false },
                        { authorId: c.get("userId") }
                    ]
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    },
                    images: true,
                    tags: true,
                    _count: {
                        select: {
                            likes: true,
                            comments: true
                        }
                    }
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.post.count({
                where: {
                    OR: [
                        { isPrivate: false },
                        { authorId: c.get("userId") }
                    ]
                }
            })
        ])

        return c.json({
            posts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

// Like/Unlike post
blogRouter.post('/:id/like', async (c) => {
    try {
        const id = c.req.param("id")
        const userId = c.get("userId")
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId: id
                }
            }
        })

        if (existingLike) {
            await prisma.like.delete({
                where: {
                    userId_postId: {
                        userId,
                        postId: id
                    }
                }
            })
            return c.json({ message: "Post unliked" })
        }

        await prisma.like.create({
            data: {
                userId,
                postId: id
            }
        })
        return c.json({ message: "Post liked" })
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

// Add comment
blogRouter.post('/:id/comment', async (c) => {
    try {
        const id = c.req.param("id")
        const body = await c.req.json()
        const validatedData = createCommentInput.parse(body)
        const userId = c.get("userId")
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        const comment = await prisma.comment.create({
            data: {
                content: validatedData.content,
                userId,
                postId: id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            }
        })

        return c.json(comment)
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

// Delete post
blogRouter.delete('/:id', async (c) => {
    try {
        const id = c.req.param("id")
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        })

        await prisma.post.delete({
            where: {
                id: id,
                authorId: c.get("userId")
            }
        })

        return c.json({ message: "Post deleted successfully" })
    } catch (e) {
        return errorHandler(e as Error, c)
    }
})

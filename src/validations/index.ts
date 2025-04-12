import { z } from 'zod';

export const signupInput = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional()
});

export const signinInput = z.object({
    email: z.string().email(),
    password: z.string()
});

export const createPostInput = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    isPrivate: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    imageUrls: z.array(z.string().url()).optional()
});

export const updatePostInput = z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    isPrivate: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    imageUrls: z.array(z.string().url()).optional()
});

export const createCommentInput = z.object({
    content: z.string().min(1)
});

export const updateUserInput = z.object({
    name: z.string().optional(),
    bio: z.string().optional(),
    image: z.string().url().optional()
});

export const paginationInput = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(50).default(10)
}); 
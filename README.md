# Medium-like Blog Platform Backend

A backend service for a Medium-like blog platform built with Hono, Prisma, and Cloudflare Workers.

## Features

- User authentication (signup, signin)
- CRUD operations for blog posts
- Image upload support
- Post privacy settings
- Comments and likes
- Tags support
- Pagination
- Error handling and validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your database URL and JWT secret.

3. Run database migrations:
```bash
npm run prisma:migrate
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/v1/user/signup` - Create a new user
- `POST /api/v1/user/signin` - Sign in a user
- `GET /api/v1/user/me` - Get current user profile
- `PUT /api/v1/user/me` - Update current user profile

### Blog Posts

- `POST /api/v1/blog` - Create a new post
- `GET /api/v1/blog` - Get all posts (paginated)
- `GET /api/v1/blog/:id` - Get a specific post
- `PUT /api/v1/blog/:id` - Update a post
- `DELETE /api/v1/blog/:id` - Delete a post
- `POST /api/v1/blog/:id/like` - Like/unlike a post
- `POST /api/v1/blog/:id/comment` - Add a comment to a post

## Environment Variables

- `DATABASE_URL` - PostgreSQL database URL
- `JWT_SECRET` - Secret key for JWT token generation

## Technologies Used

- Hono - Web framework
- Prisma - ORM
- Cloudflare Workers - Serverless platform
- PostgreSQL - Database
- Zod - Schema validation
- bcryptjs - Password hashing

```
npm run deploy
```

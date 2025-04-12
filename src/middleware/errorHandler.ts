import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const errorHandler = async (err: Error, c: Context) => {
    console.error(err);

    if (err instanceof HTTPException) {
        return c.json({ error: err.message }, err.status);
    }

    if (err.name === 'ZodError') {
        return c.json({ error: 'Validation error', details: err.message }, 400);
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.message.includes('Unique constraint')) {
            return c.json({ error: 'Resource already exists' }, 409);
        }
        return c.json({ error: 'Database error' }, 500);
    }

    return c.json({ error: 'Internal server error' }, 500);
}; 
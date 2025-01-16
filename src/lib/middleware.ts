import { basicAuth } from 'hono/basic-auth';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = basicAuth({
    username: c.env.USER,
    password: c.env.PASS,
  });

  return auth(c, next);
});

import { basicAuth } from "hono/basic-auth";
import { bearerAuth } from "hono/bearer-auth";
import { createMiddleware } from "hono/factory";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = basicAuth({
    username: c.env.USER,
    password: c.env.PASS,
  });

  return auth(c, next);
});

/**
 * Check for HTTP header
 * Authorization: Bearer <token>
 * Where <token> matches the value of env var API_TOKEN.
 * If API_TOKEN is blank, auth is never granted.
 */
export const jsonAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const bearer = bearerAuth({ token: c.env.API_TOKEN });
  return bearer(c, next);
});

import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";

import { jsonValidator } from "./validation";
import { jsonAuthMiddleware } from "./middleware";
import { createKey, listKeys } from "./cloudflare";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const api = new Hono<Env>();
api.use(prettyJSON());

api.get("/", (c) => {
  const contentType = c.req.header("content-type");

  if (contentType !== "application/json") {
    return c.redirect("/", 302);
  }

  return c.json({});
});

api.get("/links", jsonAuthMiddleware, async (c) => {
  const pairs = await listKeys(c.env.URL_SHORTENER);

  return c.json({
    ok: true,
    data: pairs,
  });
});

api.post("/links", jsonAuthMiddleware, jsonValidator, async (c) => {
  const { url, userProvidedKey } = await c.req.json();

  const key = await createKey(c.env.URL_SHORTENER, url, userProvidedKey);
  const shortUrl = new URL(`/${key}`, c.req.url);

  return c.json({
    ok: true,
    data: {
      shortUrl,
    },
  });
});

/**
 *
 * Error handling
 *
 */
// Custom 404 response
api.notFound((c) => {
  const message = c.get("errorMessage");

  return c.json(
    {
      ok: false,
      details: message ?? "404 Not Found",
    },
    404
  );
});

// Custom error response
api.onError((err, c) => {
  const respJson: JsonResponseError = {
    ok: false,
    details: err.message ?? "Unknown error",
  };

  let statusNumber = 500;
  if (err instanceof HTTPException) {
    const resp = err.getResponse();

    // Handle invalid auth
    if (resp.status === 401) {
      respJson.details = "Invalid token";
      return c.json(respJson, resp.status);
    }

    statusNumber = resp.status ?? statusNumber;
  }

  return c.json(respJson, statusNumber as ContentfulStatusCode);
});

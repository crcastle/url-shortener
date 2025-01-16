import { Hono } from 'hono'
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';

import { renderer } from './renderer'
import { validator } from './lib/validation';
import { authMiddleware } from './lib/middleware';
import { createKey, keyRegex } from './lib/cloudflare';

const app = new Hono<Env>();

app.all('*', renderer);

/**
 * Do a redirect for a short link
 */
app.get(`/:key{${keyRegex}}`, async (c) => {
  const key = c.req.param('key');
  const url = await c.env.URL_SHORTENER.get(key);

  if (url === null) {
    c.set('errorMessage', 'Unknown short URL');
    return c.notFound();
  }

  return c.redirect(url, 301);
});

/**
 * Show form to create a new short link
 * Requires auth
 */
app.get('/', authMiddleware, (c) => {
  return c.render(
    <div>
      <h2>Enter URL to shorten</h2>
      <form action="/create" method="post">
        <input
          type="text"
          name="url"
          autocomplete="off"
          style={{
            width: '80%'
          }}
        />
        &nbsp;
        <button type="submit">Create</button>
      </form>
    </div>
  );
});

/**
 * Create a new short link
 * Requires auth
 */
app.post(
  '/create',
  authMiddleware,
  csrf(),
  validator,
  async (c) => {
    const { url } = c.req.valid('form');

    const key = await createKey(c.env.URL_SHORTENER, url);

    const shortUrl = new URL(`/${key}`, c.req.url);

    return c.render(
      <div>
        <h2>Created!</h2>
        <input
          type="text"
          value={shortUrl.toString()}
          style={{
            width: '80%'
          }}
          autofocus
        />
      </div>
    )
  }
);

// Custom 404 response
app.notFound((c) => {
  const message = c.get('errorMessage');
  return c.text(message ?? '404 Not Found', 404);
});

// Custom response for errors
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const resp = err.getResponse();

    // Handle basic auth challenge correctly
    if (resp.status === 401) {
      return resp;
    }
  }

  // Otherwise return generic error
  return c.text('Server Error', 500);
});

export default app

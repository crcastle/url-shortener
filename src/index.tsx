import { Hono } from 'hono'
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';

import { renderer } from './renderer'
import { validator } from './lib/validation';
import { authMiddleware } from './lib/middleware';
import { createKey, keyRegex, listKeys } from './lib/cloudflare';

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

  const cfProperties = c.req.raw.cf;
  if (cfProperties && c.env.TRACKER) {
    c.env.TRACKER.writeDataPoint({
      blobs: [
        key as string,
        url as string,
        cfProperties.city as string,
        cfProperties.country as string,
        cfProperties.region as string,
        cfProperties.regionCode as string,
        cfProperties.timezone as string,
      ],
      doubles: [
        cfProperties.longitude as number,
        cfProperties.latitude as number,
      ],
      indexes: [key as string],
    });
    console.log(`Redirect to ${url} from ${cfProperties.city}`);
  }

  return c.redirect(url, 302);
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
      <hr />
      <div hx-get="/list" hx-trigger="load">
        <p>Loading...</p>
      </div>
    </div>
  );
});

/**
 * Get HTML table of existing short URLs
 * Requires auth
 */
app.get('/list', authMiddleware, async (c) => {
  const pairs = await listKeys(c.env.URL_SHORTENER);

  return c.html(
    <table>
      <caption>Live Short URLs</caption>
      <thead>
        <tr>
          <th>Short URL</th>
          <th>Redirects to</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(pairs).map(([key, value]) => <tr key={key}><td><a href={"/" + key}>{key}</a></td><td>{value}</td></tr>)}
      </tbody>
    </table>
  )

  // return c.json(pairs);
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

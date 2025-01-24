import { Hono } from 'hono'
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';

import { renderer } from './renderer'
import { validator } from './lib/validation';
import { authMiddleware } from './lib/middleware';
import { createKey, keyRegex, listKeys, queryClickCounts, queryLinkStats } from './lib/cloudflare';

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

  // Log data about the redirect
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
      <form action="/links" method="post">
        <input
          type="text"
          name="userProvidedKey"
          autocomplete="off"
          spellcheck={false}
          placeholder="optional"
          style={{
            width: '15%'
          }}
        />
        &nbsp;&nbsp;→&nbsp;&nbsp;
        <input
          type="text"
          name="url"
          autocomplete="off"
          placeholder="Destination URL"
          style={{
            width: '65%'
          }}
        />
        &nbsp;
        <button type="submit">Create</button>
      </form>
      <hr />
      <div hx-get="/links" hx-trigger="load">
        <p>Loading...</p>
      </div>
    </div>
  );
});

/**
 * Get HTML table of existing short URLs
 * Requires auth
 */
app.get('/links', authMiddleware, async (c) => {
  const pairs = await listKeys(c.env.URL_SHORTENER);

  const clicks = await queryClickCounts(c.env);

  return c.html(
    <table>
      <caption>Live Short URLs</caption>
      <thead>
        <tr>
          <th>Short URL</th>
          <th>Redirects to</th>
          <th>Clicks</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(pairs).map(([key, value]) => {
            return (
              <>
                <tr key={key} hx-get={"/links/" + key} hx-trigger="click" hx-target="next div" hx-swap="outerHTML">
                  <td><a href={"/" + key}>{key}</a></td>
                  <td>{value}</td>
                  <td>{clicks[key] ?? 0}</td>
                </tr>
                <tr>
                  <td colspan={3} style="padding-top: 0; padding-bottom: 0;">
                    <div id={"panel-" + key} class="panel"></div>
                  </td>
                </tr>
              </>
            );
          }
        )}
      </tbody>
    </table>
  )
});

app.get(`/links/:key{${keyRegex}}`, authMiddleware, async (c) => {
  const key = c.req.param('key');

  let linkStats;
  try {
    linkStats = await queryLinkStats(c.env, key);
  } catch (err) {
    console.error(err);

    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      message = 'Unknown error';
    }

    throw new HTTPException(500, { message, cause: err });
  }

  return c.html(
    <div id={"panel-" + key} class="panel active">
      {linkStats.map(s => <>{s.city}, {s.regionCode}, {s.country} = {s.click_count}<br/></>)}
    </div>
  );
});

/**
 * Create a new short link
 * Requires auth
 */
app.post(
  '/links',
  authMiddleware,
  csrf(),
  validator,
  async (c) => {
    const { url, userProvidedKey } = c.req.valid('form');

    const key = await createKey(c.env.URL_SHORTENER, url, userProvidedKey);

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

    if (resp.status === 400) {
      return c.render(
        <div>
          <h2>Error</h2>
          <p>{err.message}</p>
          <a href="/">Back</a>
        </div>
      );
    }
  }

  // Otherwise return generic error
  return c.text(err.message, 500);
});

export default app

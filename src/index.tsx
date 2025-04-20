import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { trimTrailingSlash } from "hono/trailing-slash";

import { renderer } from "./renderer";
import { htmlFormValidator } from "./lib/validation";
import { authMiddleware } from "./lib/middleware";
import {
  createKey,
  listKeys,
  queryClickCounts,
  queryLinkStats,
} from "./lib/cloudflare";

import { api } from "./lib/api";
import { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono<Env>();

app.use(trimTrailingSlash());
app.route("/api", api);
app.all("*", renderer);

/**
 * Redirect base domain to personal site
 */
app.get("/", (c) => c.redirect("https://crc.io/"));

/**
 * Show form to create a new short link.
 * Requires auth
 */
app.get("/admin", authMiddleware, (c) => {
  return c.render(
    <div>
      <form
        hx-boost="true"
        action="/links"
        method="post"
        hx-target="#notification"
        hx-target-error="#notification"
        hx-push-url="false"
        hx-swap="show:none"
      >
        <fieldset role="group">
          <input
            name="url-base"
            value="https://crc.is/"
            style="width: 6.5rem; background-color: #333; padding-right: 0.25rem; padding-left: 0.25rem; overflow: visible; color: #eee; border-color: #333;"
            readonly
          />
          <input
            type="text"
            name="userProvidedKey"
            autocomplete="off"
            spellcheck={false}
            placeholder="Slug"
            aria-describedBy="key-helper"
          />
        </fieldset>
        <small id="key-helper" style="padding-left: 7.5rem;">
          Optional. If left blank, four random characters are used.
        </small>
        <div>
          <h2 style="text-align: center;">↓</h2>
        </div>
        <input
          type="url"
          name="url"
          autocomplete="off"
          placeholder="Destination URL"
          required
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
 * Get HTML table of existing short URLs.
 * Requires auth
 */
app.get("/links", authMiddleware, async (c) => {
  const pairs = await listKeys(c.env.URL_SHORTENER);

  const clicks = await queryClickCounts(c.env);

  return c.html(
    <>
      <h3>Live Short URLs</h3>
      <table class="striped">
        <thead>
          <tr>
            <th scope="col" style="width: 10rem;">
              Short URL Slug
            </th>
            <th scope="col">Redirects to</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(pairs).map(([key, value]) => {
            return (
              <>
                <tr
                  key={key}
                  hx-get={"/links/" + key}
                  hx-trigger="click"
                  hx-target="next div"
                  hx-swap="outerHTML"
                >
                  <td>
                    <a href={"/" + key}>{key}</a>
                  </td>
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
          })}
        </tbody>
      </table>
    </>
  );
});

/**
 * Get click stats for a specified short link's key
 */
app.get("/links/:key", authMiddleware, async (c) => {
  const key = c.req.param("key");

  let linkStats;
  try {
    linkStats = await queryLinkStats(c.env, key);
  } catch (err) {
    console.error(err);

    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      message = "Unknown error";
    }

    throw new HTTPException(500, { message, cause: err });
  }

  return c.html(
    <div id={"panel-" + key} class="panel active">
      {linkStats.map((s) => (
        <>
          {s.city}, {s.regionCode}, {s.country} = {s.click_count}
          <br />
        </>
      ))}
    </div>
  );
});

/**
 * Do a redirect for a short link
 */
app.get("/:key", async (c) => {
  const key = c.req.param("key");
  const url = await c.env.URL_SHORTENER.get(key);

  if (url === null) {
    c.set("errorMessage", "Unknown short URL");
    return c.notFound();
  }

  // Log data about the redirect
  const cfProperties = c.req.raw.cf;
  if (cfProperties && c.env.CRC_IS_TRACKER) {
    c.env.CRC_IS_TRACKER.writeDataPoint({
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
 * Create a new short link.
 * Requires auth
 */
app.post("/links", authMiddleware, csrf(), htmlFormValidator, async (c) => {
  const { url, userProvidedKey } = c.req.valid("form");

  const key = await createKey(c.env.URL_SHORTENER, url, userProvidedKey);

  const shortUrl = new URL(`/${key}`, c.req.url);

  return c.html(
    <blockquote style="background-color: color-mix(in srgb, green 10%, transparent); border-left: 5px solid color-mix(in srgb, green 20%, transparent)">
      <p>
        Created <a href={shortUrl.toString()}>{shortUrl.toString()}</a>
      </p>
    </blockquote>
  );
});

/**
 *
 * Error handling
 *
 */
// Custom 404 response
app.notFound((c) => {
  const message = c.get("errorMessage");
  return c.text(message ?? "404 Not Found", 404);
});

// Custom response for errors
app.onError((err, c) => {
  let httpStatus = 500;
  if (err instanceof HTTPException) {
    const resp = err.getResponse();

    // Handle basic auth challenge correctly
    if (resp.status === 401) {
      return resp;
    }

    httpStatus = resp.status ?? httpStatus;
  }

  return c.html(
    <blockquote style="background-color: color-mix(in srgb, red 10%, transparent); border-left: 5px solid color-mix(in srgb, red 20%, transparent)">
      <p>Error: {err.message}</p>
    </blockquote>,
    httpStatus as ContentfulStatusCode
  );
});

export default app;

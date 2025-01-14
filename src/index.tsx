import { Hono } from 'hono'
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { csrf } from 'hono/csrf';
import { basicAuth } from 'hono/basic-auth';
import { HTTPException } from 'hono/http-exception';

import { renderer } from './renderer'

type Bindings = {
  URL_SHORTENER: KVNamespace
  USER: string
  PASS: string
}

type Variables = {
  errorMessage: string
}

// Uses "base56" character set, which excludes the following to remove ambiguity
// - number 0
// - number 1
// - upper and lower case O
// - upper and lower case I
// See https://en.wikipedia.org/wiki/Binary-to-text_encoding#Encoding_standards
const BASE_56_KEY_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

// A 4 character key provides 9.8 million unique keys
const KEY_LENGTH = 4;

const app = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>();

app.all('*', renderer);

app.notFound((c) => {
  const message = c.get('errorMessage');
  return c.text(message ?? '404 Not Found', 404);
});

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

app.get(`/:key{^(?!.*[0OoIl1])[a-zA-Z0-9]{${KEY_LENGTH}}$}`, async (c) => {
  const key = c.req.param('key');
  const url = await c.env.URL_SHORTENER.get(key);

  if (url === null) {
    c.set('errorMessage', 'Invalid short URL');
    return c.notFound();
  }

  return c.redirect(url, 301);
});

app.get('/', async (c, next) => {
  const auth = basicAuth({
    username: c.env.USER,
    password: c.env.PASS,
  });

  return auth(c, next);
});

app.get('/', (c) => {
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

const schema = z.object({
  url: z.string().url(),
});

const validator = zValidator('form', schema, (result, c) => {
  if (!result.success) {
    return c.render(
      <div>
        <h2>Error!</h2>
        <a href="/">Back</a>
      </div>
    );
  }
});

const createKey = async (kv: KVNamespace, url: string): Promise<string> => {
  let key = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * BASE_56_KEY_CHARS.length);
    key += BASE_56_KEY_CHARS.charAt(randomIndex);
  }

  const result = await kv.get(key);

  if (!result) {
    await kv.put(key, url);
  } else {
    return await createKey(kv, url);
  }

  return key;
}

app.post('/create', async (c, next) => {
  const auth = basicAuth({
    username: c.env.USER,
    password: c.env.PASS,
  });

  return auth(c, next);
});

app.post(
  '/create',
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

export default app

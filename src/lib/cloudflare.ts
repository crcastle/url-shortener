// Uses "base56" character set, which excludes the following to remove ambiguity
// - number 0
// - number 1
// - upper and lower case O
// - upper and lower case I

import { HTTPException } from "hono/http-exception";

// See https://en.wikipedia.org/wiki/Binary-to-text_encoding#Encoding_standards
const BASE_56_KEY_CHARS =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

// A 4 character key provides 9.8 million unique keys
const KEY_LENGTH = 4;

// Overly complex regex matches strings of length KEY_LENGTH
// and includes characters a-z, A-Z, and 0-9
// but excludes zero, cap O, lower O, cap I, lower L, and 1
export const keyRegex = `^(?!.*[0OoIl1])[a-zA-Z0-9]{${KEY_LENGTH}}$`;

/**
 * Create a new key and save it in Cloudflare associated with the provided url
 *
 * @param kv Namespace in which to create key/value pair
 * @param url URL to associate with new key
 * @param userProvidedKey Key provided by user. Format already validated.
 * @returns
 */
export const createKey = async (
  kv: KVNamespace,
  url: string,
  userProvidedKey?: string
): Promise<string> => {
  let key = "";
  if (userProvidedKey) {
    const result = await kv.get(userProvidedKey);
    if (!result) {
      await kv.put(userProvidedKey, url);
      key = userProvidedKey;
    } else {
      throw new HTTPException(400, {
        message: "Short link key already exists",
      });
    }
  } else {
    // Generate a key from base 56 character set
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
  }

  return key;
};

export const listKeys = async (
  kv: KVNamespace
): Promise<Record<string, string>> => {
  const keyList = await kv.list();

  const resp: Record<string, string> = {};
  for (const key of keyList.keys) {
    const value = await kv.get(key.name);
    if (value) {
      resp[key.name] = value;
    }
  }

  return resp;
};

const queryAnalyticsEngine = async (
  env: Bindings,
  sql: string
): Promise<object[]> => {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`,
    },
    body: sql,
  });

  if (!resp.ok) {
    throw new Error(await resp.text());
  }

  const json = await resp.json();

  //@ts-expect-error
  return json.data;
};

const normalizeData = (data: Array<{ key: string; click_count: string }>) => {
  const normalized: Record<string, number> = {};
  for (const dataPoint of data) {
    normalized[dataPoint.key] = parseInt(dataPoint.click_count);
  }

  return normalized;
};

export const queryClickCounts = async (env: Bindings) => {
  const query = `
          SELECT
            index1 as key,
            sum(_sample_interval) as click_count
          FROM crc_is_link_clicks
          GROUP BY key`;

  const result = (await queryAnalyticsEngine(env, query)) as Array<{
    key: string;
    click_count: string;
  }>;

  return normalizeData(result);
};

export const queryLinkStats = async (env: Bindings, key?: string) => {
  if (!key) return [];

  const query = `
          SELECT
            index1 as key,
            blob3 as city,
            blob6 as regionCode,
            blob4 as country,
            sum(_sample_interval) as click_count
          FROM crc_is_link_clicks
          WHERE index1 = '${key}'
          GROUP BY key, city, regionCode, country
          ORDER BY click_count DESC`;

  const result = (await queryAnalyticsEngine(env, query)) as Array<{
    key: string;
    city: string;
    regionCode: string;
    country: string;
    click_count: string;
  }>;

  return result;
};

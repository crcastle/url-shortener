// Uses "base56" character set, which excludes the following to remove ambiguity
// - number 0
// - number 1
// - upper and lower case O
// - upper and lower case I
// See https://en.wikipedia.org/wiki/Binary-to-text_encoding#Encoding_standards
const BASE_56_KEY_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

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
 * @returns 
 */
export const createKey = async (kv: KVNamespace, url: string): Promise<string> => {
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

export const listKeys = async (kv: KVNamespace): Promise<Record<string, string>> => {
  const keyList = await kv.list();

  const resp: Record<string, string> = {}
  for (const key of keyList.keys) {
    const value = await kv.get(key.name);
    if (value) {
      resp[key.name] = value;
    }
  }

  return resp;
}

export const queryAnalyticsEngine = async (env: Bindings, sql: string): Promise<Record<string, number>> => {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`,
    },
    body: sql,
  });

  const json = await resp.json();

  //@ts-expect-error
  return normalizeData(json.data);
}

const normalizeData = (data: AnalyticsData) => {
  const normalized: Record<string, number> = {};
  for (const dataPoint of data) {
    normalized[dataPoint.key] = parseInt(dataPoint.click_count);
  }

  return normalized;
}

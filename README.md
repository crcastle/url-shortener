# url-shortener

A URL shortener to use with your custom domain. Cloudflare Pages is used to provide a minimal GUI to create short links and provide redirects for existing short links. Short links are persisted using Cloudflare Workers KV. Minimal click analytics are collected using Cloudflare Analytics Engine.

In addition to the GUI, short links can also be created with an API.

## Run locally

Copy `wrangler.example.toml` to `wrangler.toml`, and fill in values for `CLOUDFLARE_ACCOUNT_ID`, `[[kv_namespaces]]` section, and `[[analytics_engine_datasets]]` section.

- `CLOUDFLARE_ACCOUNT_ID`: https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/
- `[[kv_namespaces]]`: Run `npm exec -- wrangler kv namespace create URL_SHORTENER`
- `[[analytics_engine_datasets]]`: Create a `binding` value and a `dataset` value. You can make these whateer you want, but the code will need reference them accurately when writing and reading analytics data. I used a binding value of `CRC_IS_TRACKER` and a dataset value of `crc_is_link_clicks`. Search the code for those values to see where and how they're used.

Now, copy `.dev.example.vars` to `.dev.vars`. In `.dev.vars`, fill in values for `USER`, `PASS`, and `API_TOKEN`. `USER` and `PASS` are required to create new short links or see a list of existing ones. `API_TOKEN` is the token for the API of the link shortener, not Cloudflare's API.

`ANALYTICS_API_TOKEN` is for Cloudflare's API. Get the value for `ANALYTICS_API_TOKEN` from https://dash.cloudflare.com/profile/api-tokens. Create a custom API token with permissions at the `Account` level, for `Account Analytics`, with permissions to `Read`. Select the appropriate Account Resources. Create it.

Now, install dependencies and run the dev server:

```txt
npm install
npm run dev
```

## Deploy to Cloudflare

Before deploying, you need to create environment variables in Cloudflare for each variable in `.dev.vars`. For example:

```
npx wrangler pages secret put USER
npx wrangler pages secret put PASS
npx wrangler pages secret put ANALYTICS_API_TOKEN
npx wrangler pages secret put API_TOKEN
```

Now build and deploy to Cloudflare!

```txt
npm run deploy
```

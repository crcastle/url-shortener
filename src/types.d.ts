type Bindings = {
  URL_SHORTENER: KVNamespace
  TRACKER: AnalyticsEngineDataset
  USER: string
  PASS: string
  ANALYTICS_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
}
  
type Variables = {
  errorMessage: string
}
  
type Env = {
  Bindings: Bindings
  Variables: Variables
}

type AnalyticsData = Array<{
  index1: string
  "sum(_sample_interval)": string
}>

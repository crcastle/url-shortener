type Bindings = {
  URL_SHORTENER: KVNamespace
  USER: string
  PASS: string
}
  
type Variables = {
  errorMessage: string
}
  
  type Env = {
  Bindings: Bindings
  Variables: Variables
}

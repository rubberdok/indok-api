environment_variables = [
  {
    name  = "CORS_ORIGINS"
    value = "https://indokntnu.no"
  },
  {
    name  = "CORS_CREDENTIALS"
    value = "true"
  },
  {
    name  = "NODE_ENV"
    value = "production"
  },
  {
    name  = "NO_REPLY_EMAIL"
    value = "no-reply@indokntnu.no"
  },
  {
    name  = "PORT"
    value = 4000
  },
  {
    name  = "FEIDE_CLIENT_ID"
    value = "abc"
  },
  {
    name  = "FEIDE_CLIENT_SECRET"
    value = "abc"
  },
  {
    name  = "FEIDE_REDIRECT_URI"
    value = "https://indokntnu.no/api/auth/feide/callback"
  },
  {
    name  = "FEIDE_BASE_URL"
    value = "https://auth.dataporten.no"
  },
  {
    name  = "FEIDE_VERIFIER_SECRET"
    value = "abc"
  },
  {
    name  = "POSTMARK_API_TOKEN"
    value = "abc"
  },
  {
    name  = "32_CHAR_SESSION_SECRET"
    value = "a really long and really secret session secret"
  },
  {
    name  = "SESSION_COOKIE_NAME"
    value = "abc"
  },
  {
    name  = "SESSION_COOKIE_DOMAIN"
    value = "abc"
  },
  {
    name  = "SESSION_COOKIE_HTTP_ONLY"
    value = "abc"
  },
  {
    name  = "SESSION_COOKIE_SECURE"
    value = "abc"
  },
  {
    name  = "REDIS_CERT_PATH"
    value = "/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem"
  },
  {
    name  = "SENTRY_DSN"
    value = "https://3e8801d618184101b5d2c6b7b4da6f0b@o514678.ingest.sentry.io/6553834"
  }
]


environment = "production"

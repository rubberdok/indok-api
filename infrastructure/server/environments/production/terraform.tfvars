/*
--- IMPORTANT ---
This file MUST NOT contain any secrets.
It is checked into version control and is therefore public.

Secrets should be stored in the Azure Key Vault and inject into the containers at runtime.
See `infrastucture/modules/server/server_app.tf` and `infrastucture/modules/server/secrets.tf`
on how to do this.
*/

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
    name  = "SERVER_URL"
    value = "https://server-3b8qd1il.whiteflower-a46872f4.norwayeast.azurecontainerapps.io"
  },
  {
    name  = "FEIDE_CLIENT_ID"
    value = "fcaa9e30-a6d3-4809-8fea-cdd7b3de1c98"
  },
  {
    name  = "FEIDE_BASE_URL"
    value = "https://auth.dataporten.no"
  },
  {
    name  = "RATE_LIMIT_MAX",
    value = 1000
  },
  {
    name  = "SESSION_COOKIE_NAME"
    value = "sessionid"
  },
  {
    name  = "SESSION_COOKIE_DOMAIN"
    value = "server-3b8qd1il.whiteflower-a46872f4.norwayeast.azurecontainerapps.io"
  },
  {
    name  = "SESSION_COOKIE_HTTP_ONLY"
    value = "true"
  },
  {
    name  = "SESSION_COOKIE_SECURE"
    value = "true"
  },
  {
    name  = "SENTRY_DSN"
    value = "https://3e8801d618184101b5d2c6b7b4da6f0b@o514678.ingest.sentry.io/6553834"
  }
]


environment = "production"

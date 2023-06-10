module "container_app" {
  source = "./modules/container_app"

  name = local.environment_name
  tags = local.tags

  resource_group = {
    name     = module.resource_group.name
    location = module.resource_group.location
  }

  docker_registry_server_url = "ghcr.io"
  docker_registry_username   = "USERNAME"
  docker_registry_password   = var.docker_registry_password

  secrets = [
    {
      name  = "redis-connection-string"
      value = "@Microsoft.KeyVault(VaultName=${module.key_vault.name};SecretName=${azurerm_key_vault_secret.redis_connection_string.name}})"
    },
    {
      name  = "database-connection-string"
      value = "@Microsoft.KeyVault(VaultName=${module.key_vault.name};SecretName=${azurerm_key_vault_secret.db_connection_string.name}})"
    },
  ]

  envs = [
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
      name        = "DATABASE_URL"
      secret_name = "database-connection-string"
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
      name  = "SESSION_SECRET"
      value = "abc"
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
      name        = "REDIS_URL"
      secret_name = "redis-connection-string"
    },
  ]
}

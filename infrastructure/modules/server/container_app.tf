module "container_app" {
  source = "../container_app"

  name = "container-app-${var.suffix}"
  tags = local.tags

  resource_group = {
    name     = module.resource_group.name
    location = module.resource_group.location
  }

  docker_registry_server_url = "ghcr.io"
  docker_registry_username   = "USERNAME"
  docker_registry_password   = var.docker_registry_password

  secrets = concat([
    {
      name  = "redis-connection-string"
      value = azurerm_key_vault_secret.redis_connection_string.value
    },
    {
      name  = "database-connection-string"
      value = azurerm_key_vault_secret.db_connection_string.value
    },
  ], var.secrets)
  envs = concat([
    {
      name        = "REDIS_CONNECTION_STRING"
      secret_name = "redis-connection-string"
    },
    {
      name        = "DATABASE_CONNECTION_STRING"
      secret_name = "database-connection-string"
    },
  ], var.environment_variables)
}

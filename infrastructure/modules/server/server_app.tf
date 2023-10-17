# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
resource "azurerm_container_app" "server" {
  name = "server-${var.suffix}"

  container_app_environment_id = module.container_app_environment.id

  resource_group_name = module.resource_group.name
  revision_mode       = "Single"

  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.value.name
      value = secret.value.value
    }
  }

  secret {
    name  = "feide-client-secret"
    value = data.azurerm_key_vault_secret.feide_client_secret.value
  }

  secret {
    name  = "docker-registry-password"
    value = var.docker_registry_password
  }

  secret {
    name  = "redis-connection-string"
    value = azurerm_key_vault_secret.redis_connection_string.value
  }

  secret {
    name  = "database-connection-string"
    value = azurerm_key_vault_secret.db_connection_string.value
  }

  registry {
    username             = "USERNAME"
    password_secret_name = "docker-registry-password"
    server               = "ghcr.io"
  }

  template {
    min_replicas = 1
    container {
      cpu    = 0.25
      memory = "0.5Gi"
      name   = "server"
      image  = var.image_tag

      liveness_probe {
        failure_count_threshold = 3
        header {
          name  = "apollo-require-preflight"
          value = true
        }

        interval_seconds = 10
        path             = "/graphql?query=%7B__typename%7D"
        port             = 4000
        transport        = "HTTP"
        initial_delay    = 5
      }

      dynamic "env" {
        for_each = var.environment_variables
        content {
          name        = env.value.name
          secret_name = try(env.value.secret_name, null)
          value       = try(env.value.value, null)
        }
      }

      env {
        name        = "REDIS_CONNECTION_STRING"
        secret_name = "redis-connection-string"
      }

      env {
        name        = "DATABASE_CONNECTION_STRING"
        secret_name = "database-connection-string"
      }

      env {
        name        = "FEIDE_CLIENT_SECRET"
        secret_name = "feide-client-secret"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 4000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }


  tags = local.tags
}

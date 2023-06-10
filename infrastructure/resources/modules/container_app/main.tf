
resource "azurerm_log_analytics_workspace" "this" {
  name                = var.name
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = var.name
  location                   = var.resource_group.location
  resource_group_name        = var.resource_group.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  tags = var.tags
}


# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
resource "azurerm_container_app" "this" {
  name = var.name

  container_app_environment_id = azurerm_container_app_environment.this.id

  resource_group_name = var.resource_group.name
  revision_mode       = "Single"


  secret {
    name  = "docker-registry-password"
    value = var.docker_registry_password
  }

  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.value.name
      value = secret.value.value
    }
  }

  registry {
    username             = var.docker_registry_username
    password_secret_name = "docker-registry-password"
    server               = var.docker_registry_server_url
  }

  template {
    container {
      cpu    = var.container.cpu
      memory = var.container.memory
      name   = "server"
      image  = var.docker_image_tag

      dynamic "env" {
        for_each = var.envs
        content {
          name        = env.value.name
          secret_name = try(env.value.secret_name, null)
          value       = try(env.value.value, null)
        }
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


  tags = var.tags

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }

}

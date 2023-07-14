
# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace
resource "azurerm_log_analytics_workspace" "this" {
  name                = "ca-log-workspace-${var.suffix}"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Create a subnet in our Virtual Network on Azure and delegate it to our Container App, so that it can
# access the database and other resources on the virtual network.
resource "azurerm_subnet" "this" {
  name                 = "ca-subnet-${var.suffix}"
  resource_group_name  = var.resource_group.name
  virtual_network_name = var.network.virtual_network_name
  address_prefixes     = ["10.0.0.0/21"]
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment
resource "azurerm_container_app_environment" "this" {
  name                       = "ca-env-${var.suffix}"
  location                   = var.resource_group.location
  resource_group_name        = var.resource_group.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  infrastructure_subnet_id   = azurerm_subnet.this.id

  tags = var.tags
}



# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
resource "azurerm_container_app" "this" {
  name = "ca-${var.suffix}"

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
    min_replicas = 1
    container {
      cpu    = var.container.cpu
      memory = var.container.memory
      name   = "server"
      image  = var.docker_image_tag

      liveness_probe {
        failure_count_threshold = 3
        header {
          name  = "apollo-require-preflight"
          value = true
        }

        interval_seconds = 10
        path             = "/graphql?query=%7B__typename%7D"
        port             = 4000
        transport        = "HTTPS"
        initial_delay    = 5
      }

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

  # We will manage the lifecycle of the images ourselves, so we ignore changes to the image.
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }

}

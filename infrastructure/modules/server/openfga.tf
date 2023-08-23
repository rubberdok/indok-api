resource "random_password" "openfga_password" {
  length           = 32
  special          = true
  min_lower        = 1
  min_numeric      = 1
  min_upper        = 1
  min_special      = 1
  override_special = "-"
}

module "openfga_database" {
  source = "../postgres"

  suffix         = var.suffix
  prefix         = "fga"
  resource_group = module.resource_group

  postgres = var.postgres

  network = {
    virtual_network_name = module.vnet.name
    virtual_network_id   = module.vnet.id
    address_prefixes     = ["10.0.130.0/24"]
  }

  authentication = {
    administrator_login    = "postgres"
    administrator_password = random_password.password.result
  }

  environment = var.environment

  tags = local.tags
}

resource "azurerm_key_vault_secret" "openfga_db_connection_string" {
  name         = "openfga-db-connection-string"
  value        = "${module.openfga_database.connection_string}&sslrootcert=/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem"
  key_vault_id = module.key_vault.id
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
resource "azurerm_container_app" "openfga" {
  name = "openfga-${var.suffix}"

  container_app_environment_id = module.container_app_environment.id

  resource_group_name = module.resource_group.name
  revision_mode       = "Single"

  secret {
    name  = "database-connection-string"
    value = azurerm_key_vault_secret.openfga_db_connection_string.value
  }

  secret {
    name  = "docker-registry-password"
    value = var.docker_registry_password
  }

  registry {
    username             = "USERNAME"
    password_secret_name = "docker-registry-password"
    server               = "ghcr.io"
  }

  template {
    min_replicas = 1
    container {
      cpu     = 0.25
      memory  = "0.5Gi"
      name    = "main"
      image   = "ghcr.io/rubberdok/openfga:latest"
      command = ["/openfga", "run", "--log-format", "json", "--log-level", "info"]

      env {
        name        = "OPENFGA_DATASTORE_URI"
        secret_name = "database-connection-string"
      }

      env {
        name  = "OPENFGA_DATASTORE_ENGINE"
        value = "postgres"
      }
    }
  }

  ingress {
    external_enabled = false
    target_port      = 8080
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }


  tags = local.tags
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
resource "azurerm_container_app" "openfga_migrate" {
  name = "fga-migrate-${var.suffix}"

  container_app_environment_id = module.container_app_environment.id

  resource_group_name = module.resource_group.name
  revision_mode       = "Single"

  secret {
    name  = "docker-registry-password"
    value = var.docker_registry_password
  }

  registry {
    username             = "USERNAME"
    password_secret_name = "docker-registry-password"
    server               = "ghcr.io"
  }

  secret {
    name  = "database-connection-string"
    value = azurerm_key_vault_secret.openfga_db_connection_string.value
  }

  template {
    container {
      cpu     = 0.25
      memory  = "0.5Gi"
      name    = "main"
      image   = "ghcr.io/rubberdok/openfga:latest"
      command = ["/openfga", "migrate", "--verbose"]

      env {
        name        = "OPENFGA_DATASTORE_URI"
        secret_name = "database-connection-string"
      }

      env {
        name  = "OPENFGA_DATASTORE_ENGINE"
        value = "postgres"
      }
    }
  }

  tags = local.tags
}

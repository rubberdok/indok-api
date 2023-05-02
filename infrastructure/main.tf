terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.54.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "tfstate"
    storage_account_name = "tfstate3k0gx"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
    use_oidc             = true
  }
}

provider "azurerm" {
  use_oidc = true
  features {}
}

data "azurerm_client_config" "current" {
}




module "resource_group" {
  source = "./modules/resource-group"

  name = "indok-web-${terraform.workspace}"

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

module "key_vault" {
  source = "./modules/key_vault"

  resource_group_name = module.resource_group.name
  tenant_id           = data.azurerm_client_config.current.tenant_id

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

module "database" {
  source = "./modules/postgres"

  resource_group_name = module.resource_group.name
  sku_name            = var.postgres.sku_name
  storage_mb          = var.postgres.storage_mb

  administrator_login          = "postgres"
  administrator_login_password = module.key_vault.secrets.postgres_password

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

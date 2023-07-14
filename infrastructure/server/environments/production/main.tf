terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.64.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.24.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "tfstate"
    storage_account_name = "tfstate1dyqh"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
    use_oidc             = true
  }
}

provider "azurerm" {
  use_oidc = true
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "github" {
  owner = "rubberdok"
}

data "azurerm_client_config" "current" {}

resource "random_string" "resource_code" {
  length  = 8
  special = false
  upper   = false
}


module "server" {
  source = "../../../modules/server"
  suffix = random_string.resource_code.result

  environment_variables    = var.environment_variables
  docker_registry_password = var.docker_registry_password
  environment              = var.environment

  postgres = {
    sku_name   = "B_Standard_B1ms"
    storage_mb = 32768
  }

  redis = {
    sku_name = "Basic"
    family   = "C"
    capacity = "0"
  }

}

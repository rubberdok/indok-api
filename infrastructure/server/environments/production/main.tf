terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.4.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.3.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12.1"
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

  environment_variables = concat(var.environment_variables, [{
    name  = "SENTRY_RELEASE",
    value = var.git_sha
  }])

  docker_registry_password = var.docker_registry_password
  environment              = var.environment
  image_tag                = var.image_tag
  blob_storage             = var.blob_storage

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

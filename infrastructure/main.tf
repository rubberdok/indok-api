terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.54.0"
    }
    github = {
      source  = "integrations/github"
      version = "=5.24.0"
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

locals {
  environment_name = "indok-web-${terraform.workspace}"
  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}


terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0.2"
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
    resource_group_name  = "shared"
    storage_account_name = "tfstateyn8h4"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
    use_oidc             = true
  }
}

provider "azurerm" {
  use_oidc = true
  features {}
}

provider "azuread" {
  use_oidc  = true
  tenant_id = data.azurerm_client_config.current.tenant_id
}

provider "github" {
  owner = "rubberdok"
}

data "azurerm_client_config" "current" {}

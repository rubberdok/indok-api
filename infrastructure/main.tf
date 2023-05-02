terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.0.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "tfstate"
    storage_account_name = "tfstate3k0gx"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

module "resource_group" {
  source = "./modules/resource-group"

  name = "indok-web-${var.environment}"

  tags = {
    environment = var.environment
  }
}

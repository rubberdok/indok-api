locals {
  environment_name = "indok-web-${terraform.workspace}"
  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

data "azurerm_client_config" "current" {}

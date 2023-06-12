resource "azurerm_resource_group" "tfstate" {
  name     = "tfstate"
  location = "Norway East"
  tags = {
    environment = "shared"
  }

  lifecycle {
    prevent_destroy = true
  }
}

module "tfstate" {
  source = "../modules/remote_state"

  resource_group = azurerm_resource_group.tfstate
  tags = {
    environment = "shared"
  }
}

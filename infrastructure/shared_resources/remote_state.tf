resource "azurerm_resource_group" "shared" {
  name     = "shared"
  location = "Norway East"
  tags = {
    environment = "shared"
  }

  lifecycle {
    prevent_destroy = true
  }
}

module "remote_state" {
  source = "../modules/remote_state"

  resource_group = azurerm_resource_group.shared
  tags = {
    environment = "shared"
  }
}

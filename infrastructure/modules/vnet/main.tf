resource "azurerm_virtual_network" "this" {
  name                = "vnet-${var.suffix}"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name
  address_space       = ["10.0.0.0/16"]
}

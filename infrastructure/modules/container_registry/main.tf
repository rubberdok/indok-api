resource "azurerm_container_registry" "container_registry" {
  name                = "${var.resource_prefix}-container-registry"
  resource_group_name = azurerm_resource_group.resource_group.name
  location            = azurerm_resource_group.resource_group.location
  sku                 = "Basic"
  admin_enabled       = false
}
resource "azurerm_resource_group" "resource_group" {
  name     = var.name
  location = "Norway East"

  tags = var.tags
}

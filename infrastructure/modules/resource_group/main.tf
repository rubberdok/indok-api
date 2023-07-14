# Resource Group to hold all resources for a given environment.
resource "azurerm_resource_group" "this" {
  name     = var.name
  location = "Norway East"

  tags = var.tags
}

resource "azurerm_user_assigned_identity" "managed_identity" {
  location            = "Norway East"
  name                = var.name
  resource_group_name = var.resource_group_name
  tags = var.tags
}

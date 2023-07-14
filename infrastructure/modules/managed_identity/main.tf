# We use a managed identity to have an identity with only the permissions it needs
# to run the application.
resource "azurerm_user_assigned_identity" "this" {
  location            = "Norway East"
  name                = var.name
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

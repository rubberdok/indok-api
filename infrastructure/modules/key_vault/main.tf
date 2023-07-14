# Key Vault for secrets required to run the application.
resource "azurerm_key_vault" "this" {
  name     = var.name
  location = var.resource_group.location
  sku_name = "standard"

  enable_rbac_authorization = true

  resource_group_name = var.resource_group.name
  tags                = var.tags
  tenant_id           = var.tenant_id
}

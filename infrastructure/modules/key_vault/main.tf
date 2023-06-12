resource "azurerm_key_vault" "this" {
  name     = var.name
  location = var.resource_group.location
  sku_name = "standard"

  enable_rbac_authorization = true

  resource_group_name = var.resource_group.name
  tags                = var.tags
  tenant_id           = var.tenant_id
}


resource "azurerm_role_assignment" "key_vault_officer" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.current_service_principal.object_id
}

resource "azurerm_role_assignment" "key_vault_user" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.principal_id
}

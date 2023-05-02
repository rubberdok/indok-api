resource "azurerm_key_vault" "key_vault" {
  name     = var.name
  location = "Norway East"
  sku_name = "standard"

  enabled_for_disk_encryption = true
  enabled_for_deployment      = true

  resource_group_name = var.resource_group_name
  tags                = var.tags
  tenant_id           = var.tenant_id
}

resource "random_password" "password" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "postgres_password" {
  depends_on   = [azurerm_key_vault_access_policy.current_principal, azurerm_key_vault_access_policy.principal]
  name         = "postgres-password"
  value        = random_password.password.result
  key_vault_id = azurerm_key_vault.key_vault.id
}

resource "azurerm_key_vault_access_policy" "principal" {
  key_vault_id = azurerm_key_vault.key_vault.id
  tenant_id    = var.tenant_id
  object_id    = var.principal_id

  key_permissions = [
    "Get", "List", "Create"
  ]
  secret_permissions = ["Get", "List", "Set"]
}

resource "azurerm_key_vault_access_policy" "current_principal" {
  key_vault_id = azurerm_key_vault.key_vault.id
  tenant_id    = var.current_service_principal.tenant_id
  object_id    = var.current_service_principal.object_id

  key_permissions = [
    "Get", "List", "Create"
  ]
  secret_permissions = ["Get", "List", "Set"]
}

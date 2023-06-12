resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}


resource "azurerm_key_vault" "shared" {
  name                = "shared-key-vault-${random_string.resource_code.result}"
  location            = azurerm_resource_group.shared.location
  resource_group_name = azurerm_resource_group.shared.name

  enable_rbac_authorization = true

  sku_name = "standard"

  tags = {
    environment = "shared"
  }

  tenant_id = data.azurerm_client_config.current.tenant_id
}

resource "azurerm_role_assignment" "key_vault_officer" {
  for_each             = toset([azuread_service_principal.github.object_id, data.azurerm_client_config.current.object_id])
  scope                = azurerm_key_vault.shared.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = each.key
}

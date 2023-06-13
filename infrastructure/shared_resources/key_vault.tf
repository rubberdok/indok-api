locals {
  azure_admin_user_id = "aebaf770-f990-4042-ba63-0bad65e6a23e"
}

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

resource "azurerm_role_assignment" "admin_user_key_vault_officer" {
  for_each             = toset([local.azure_admin_user_id])
  scope                = azurerm_key_vault.shared.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = each.key
}

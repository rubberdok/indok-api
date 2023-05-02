resource "azurerm_key_vault" "key_vault" {
  name     = var.name
  location = "Norway East"
  sku_name = "standard"

  enabled_for_disk_encryption = true
  enabled_for_deployment      = true

  resource_group_name = var.resource_group_name
  tags                = var.tags
  tenant_id           = var.tenant_id

  access_policy = [
    {
      application_id = var.application_id
      tenant_id      = var.tenant_id
      object_id      = var.principal_id

      key_permissions = [
        "Get", "List",
      ]
      secret_permissions      = ["Get", "List", ]
      storage_permissions     = []
      certificate_permissions = []
    },
    {
      application_id = var.application_id
      tenant_id      = var.current_service_principal.tenant_id
      object_id      = var.current_service_principal.object_id

      key_permissions = [
        "Backup", "Create", "Decrypt", "Delete", "Encrypt", "Get", "Import", "List", "Purge", "Recover", "Restore", "Sign", "UnwrapKey", "Update", "Verify", "WrapKey", "Release", "Rotate", "GetRotationPolicy", "SetRotationPolicy",
      ]
      secret_permissions = [
        "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set", "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set",
      ]
      storage_permissions     = []
      certificate_permissions = []
    },
  ]
}

resource "random_password" "password" {
  length      = 128
  special     = true
  min_lower   = 1
  min_numeric = 1
  min_upper   = 1
  min_special = 1
}


resource "time_sleep" "vault" {
  depends_on      = [azurerm_key_vault.key_vault]
  create_duration = "10s"
}


resource "azurerm_key_vault_secret" "postgres_password" {
  depends_on   = [time_sleep.vault]
  name         = "postgres-password"
  value        = random_password.password.result
  key_vault_id = azurerm_key_vault.key_vault.id
}

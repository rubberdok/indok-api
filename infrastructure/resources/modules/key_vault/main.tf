resource "azurerm_key_vault" "this" {
  name     = var.name
  location = "Norway East"
  sku_name = "standard"

  enabled_for_disk_encryption = true
  enabled_for_deployment      = true

  resource_group_name = var.resource_group_name
  tags                = var.tags
  tenant_id           = var.tenant_id

  access_policy {
    tenant_id = var.tenant_id
    object_id = var.principal_id

    key_permissions    = ["Get", "List", ]
    secret_permissions = ["Get", "List", ]
  }

  access_policy {
    tenant_id = var.tenant_id
    object_id = var.current_service_principal.object_id

    key_permissions = [
      "Create",
      "Delete",
      "Get",
      "List",
      "Purge",
      "Recover",
      "Restore",
      "Update",
    ]
    secret_permissions = [
      "Delete",
      "Get",
      "List",
      "Purge",
      "Recover",
      "Restore",
      "Set",
    ]
  }

}

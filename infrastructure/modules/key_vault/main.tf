resource "azurerm_key_vault" "key_vault" {
  name     = "rubberdok-key-vault"
  location = "Norway East"
  sku_name = "standard"

  enabled_for_disk_encryption = true
  enabled_for_deployment      = true

  resource_group_name = var.resource_group_name
  tags                = var.tags
  tenant_id           = var.tenant_id
}

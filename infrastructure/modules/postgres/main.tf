resource "azurerm_postgresql_server" "database" {
  name     = var.name
  location = "Norway East"

  sku_name   = var.sku_name
  version    = 11
  storage_mb = var.storage_mb

  resource_group_name = var.resource_group_name
  tags                = var.tags

  administrator_login          = var.administrator_login
  administrator_login_password = var.administrator_login_password

  ssl_enforcement_enabled = true
}




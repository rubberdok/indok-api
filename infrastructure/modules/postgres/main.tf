resource "azurerm_postgresql_flexible_server" "this" {
  name     = var.name
  location = "Norway East"

  sku_name   = var.sku_name
  version    = "12"
  storage_mb = var.storage_mb

  resource_group_name = var.resource_group_name
  tags                = var.tags

  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password

  zone = "2"
}




resource "azurerm_postgresql_flexible_server_database" "this" {
  name      = var.name
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

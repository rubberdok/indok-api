resource "azurerm_subnet" "this" {
  name                 = "subnet-${var.suffix}"
  resource_group_name  = var.resource_group.name
  virtual_network_name = var.network.virtual_network_name
  address_prefixes     = ["10.0.2.0/24"]

  service_endpoints = ["Microsoft.Storage"]
  delegation {
    name = "fs"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_private_dns_zone" "this" {
  name                = "primary.postgres.database.azure.com"
  resource_group_name = var.resource_group.name
}


resource "azurerm_postgresql_flexible_server" "this" {
  name     = "pg-fs-${var.suffix}"
  location = var.resource_group.name

  sku_name   = var.sku_name
  version    = "15"
  storage_mb = var.storage_mb

  resource_group_name = var.resource_group_name
  tags                = var.tags

  administrator_login    = var.authentication.administrator_login
  administrator_password = var.authentication.administrator_password

  delegated_subnet_id = azurerm_subnet.this.id
  private_dns_zone_id = azurerm_private_dns_zone.this.id

  zone = "1"
}

resource "azurerm_postgresql_flexible_server_database" "this" {
  name      = "pg-fs-db-${var.suffix}"
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

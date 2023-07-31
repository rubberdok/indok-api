
# To avoid having our database publicly accessible, we will create a subnet in our Virtual Network
# and delegate it to our PostgreSQL Flexible Server. This allows for private connections from our app
# to the database.
resource "azurerm_subnet" "this" {
  name                 = "${var.prefix}-pgsn-${var.suffix}"
  resource_group_name  = var.resource_group.name
  virtual_network_name = var.network.virtual_network_name
  address_prefixes     = var.network.address_prefixes

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


# We will also need to create a Private DNS Zone to resolve our PostgreSQL Flexible Server.
resource "azurerm_private_dns_zone" "this" {
  name                = "${var.environment}.${var.prefix}${var.suffix}.postgres.database.azure.com"
  resource_group_name = var.resource_group.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "this" {
  name                  = "${var.prefix}-pglink-${var.suffix}.com"
  resource_group_name   = var.resource_group.name
  private_dns_zone_name = azurerm_private_dns_zone.this.name
  virtual_network_id    = var.network.virtual_network_id
}


# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
# Sets up a PostgreSQL Flexible Server.
resource "azurerm_postgresql_flexible_server" "this" {
  name                = "${var.prefix}-pgfs-${var.suffix}"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name

  sku_name   = var.postgres.sku_name
  version    = "14"
  storage_mb = var.postgres.storage_mb

  tags = var.tags

  administrator_login    = var.authentication.administrator_login
  administrator_password = var.authentication.administrator_password

  delegated_subnet_id = azurerm_subnet.this.id
  private_dns_zone_id = azurerm_private_dns_zone.this.id

  zone = "1"

  depends_on = [azurerm_private_dns_zone_virtual_network_link.this]
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server_database
# Creates a database on our PostgreSQL Flexible Server.
resource "azurerm_postgresql_flexible_server_database" "this" {
  name      = "${var.prefix}-pgdb-${var.suffix}"
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

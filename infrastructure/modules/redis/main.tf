resource "azurerm_redis_cache" "this" {
  name                = var.name
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name

  public_network_access_enabled = false

  sku_name = var.sku_name
  family   = var.family
  capacity = var.capacity

  minimum_tls_version = "1.2"

  tags = var.tags
}

resource "azurerm_subnet" "this" {
  name                 = "redis-subnet-${var.suffix}"
  resource_group_name  = var.resource_group.name
  virtual_network_name = var.network.virtual_network_name
  address_prefixes     = ["10.0.129.0/24"]

  private_link_service_network_policies_enabled = true
}

resource "azurerm_private_endpoint" "this" {
  name                = "endpoint-${var.suffix}"
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location
  subnet_id           = azurerm_subnet.this.id

  private_dns_zone_group {
    name                 = "redis-${var.suffix}-zg"
    private_dns_zone_ids = [azurerm_private_dns_zone.this.id]
  }


  private_service_connection {
    name                           = "redis-${var.suffix}-private-link"
    private_connection_resource_id = azurerm_redis_cache.this.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }
}

resource "azurerm_private_dns_zone" "this" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = var.resource_group.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "this" {
  name                  = "vnet-private-zone-link"
  resource_group_name   = var.resource_group.name
  private_dns_zone_name = azurerm_private_dns_zone.this.name
  virtual_network_id    = var.network.virtual_network_id
}

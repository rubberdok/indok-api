resource "azurerm_redis_cache" "this" {
  name                = var.name
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name

  sku_name = var.sku_name
  family   = var.family
  capacity = var.capacity

  minimum_tls_version = "1.2"

  tags = var.tags
}

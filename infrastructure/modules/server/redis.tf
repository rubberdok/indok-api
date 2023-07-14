module "redis" {
  source = "../redis"

  name           = "redis-${var.suffix}"
  resource_group = module.resource_group

  sku_name = var.redis.sku_name
  family   = var.redis.family
  capacity = var.redis.capacity

  network = {
    virtual_network_name = module.vnet.name
    virtual_network_id   = module.vnet.id
  }

  suffix = var.suffix

  tags = local.tags
}

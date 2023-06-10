module "redis" {
  source = "./modules/redis"

  name           = local.environment_name
  resource_group = module.resource_group

  sku_name = var.redis.sku_name
  family   = var.redis.family
  capacity = var.redis.capacity

  tags = local.tags
}

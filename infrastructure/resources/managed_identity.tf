module "managed_identity" {
  source = "./modules/managed_identity"

  name                = local.environment_name
  resource_group_name = module.resource_group.name
  tags                = local.tags
}

module "resource_group" {
  source = "./modules/resource_group"

  name = local.environment_name

  tags = local.tags
}

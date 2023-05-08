module "resource_group" {
  source = "./modules/resource-group"

  name = local.environment_name

  tags = local.tags
}

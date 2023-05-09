resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

module "function" {
  source = "./modules/function"

  resource_name = "function${random_string.resource_code.result}"
  name          = local.environment_name

  identity_id = module.managed_identity.id

  resource_group = {
    name     = module.resource_group.name
    location = module.resource_group.location
  }

  sku_name = var.function.sku_name
  always_on = var.function.always_on

  tags = merge(local.tags, { "use-case" = "function" })
}

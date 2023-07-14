module "vnet" {
  source = "../vnet"

  resource_group = module.resource_group
  suffix         = var.suffix
}

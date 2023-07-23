module "container_app_environment" {
  source = "../container_app_environment"

  network = {
    virtual_network_name = module.vnet.name
  }

  resource_group = module.resource_group
  suffix         = var.suffix
  tags           = local.tags
}

resource "random_password" "password" {
  length           = 32
  special          = true
  min_lower        = 1
  min_numeric      = 1
  min_upper        = 1
  min_special      = 1
  override_special = "-"
}

module "database" {
  source = "../postgres"

  suffix         = var.suffix
  resource_group = module.resource_group

  postgres = var.postgres

  network = {
    virtual_network_name = module.vnet.name
    virtual_network_id   = module.vnet.id
  }

  authentication = {
    administrator_login    = "postgres"
    administrator_password = random_password.password.result
  }

  environment = var.environment

  tags = local.tags
}

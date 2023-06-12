resource "random_password" "password" {
  length           = 128
  special          = true
  min_lower        = 1
  min_numeric      = 1
  min_upper        = 1
  min_special      = 1
  override_special = "-"
}

module "database" {
  source = "../postgres"

  name                = "postgres-${var.suffix}"
  resource_group_name = module.resource_group.name
  sku_name            = var.postgres.sku_name
  storage_mb          = var.postgres.storage_mb

  administrator_login    = "postgres"
  administrator_password = random_password.password.result

  tags = local.tags
}

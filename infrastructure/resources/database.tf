module "database" {
  source = "./modules/postgres"

  name                = local.environment_name
  resource_group_name = module.resource_group.name
  sku_name            = var.postgres.sku_name
  storage_mb          = var.postgres.storage_mb

  administrator_login          = "postgres"
  administrator_login_password = module.secret.postgres_password.plaintext_value

  tags = local.tags
}

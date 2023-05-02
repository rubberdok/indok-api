module "database" {
  source = "./modules/postgres"

  resource_group_name = module.resource_group.name
  sku_name            = var.postgres.sku_name
  storage_mb          = var.postgres.storage_mb

  administrator_login          = "postgres"
  administrator_login_password = module.key_vault.secrets.postgres_password

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

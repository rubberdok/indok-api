resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

module "app_service" {
  source = "./modules/app"

  resource_name = "app-service${random_string.resource_code.result}"
  name          = local.environment_name

  identity_id = module.managed_identity.id

  resource_group = {
    name     = module.resource_group.name
    location = module.resource_group.location
  }

  sku_name = var.app_service.sku_name

  secrets = [{key = module.secret.postgres_password.name, name = "POSTGRES_PASSWORD"}]
  key_vault_name = module.key_vault.name

  tags = merge(local.tags, { "use-case" = "app-service" })
}

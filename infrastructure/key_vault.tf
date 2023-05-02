module "key_vault" {
  source = "./modules/key_vault"

  resource_group_name = module.resource_group.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  principal_id        = module.application.principal_id
  name                = local.environment_name

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

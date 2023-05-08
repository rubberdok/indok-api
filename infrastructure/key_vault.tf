module "key_vault" {
  source = "./modules/key_vault"

  resource_group_name = module.resource_group.name

  tenant_id      = module.managed_identity.tenant_id
  principal_id   = module.managed_identity.principal_id
  application_id = data.azurerm_client_config.current.client_id
  name           = local.environment_name

  current_service_principal = {
    tenant_id      = data.azurerm_client_config.current.tenant_id
    object_id      = "b449a1f3-328d-4548-8ab1-6e1dc048edff"
    application_id = data.azurerm_client_config.current.client_id
  }

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

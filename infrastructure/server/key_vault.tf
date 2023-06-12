module "key_vault" {
  source = "../modules/key_vault"

  resource_group = module.resource_group

  tenant_id    = module.managed_identity.tenant_id
  principal_id = module.managed_identity.principal_id
  name         = local.environment_name

  current_service_principal = {
    object_id = data.azurerm_client_config.current.object_id
  }

  tags = local.tags
}

module "managed_identity" {
  source = "../managed_identity"

  name                = "managed-identity-${var.suffix}"
  resource_group_name = module.resource_group.name
  tags                = local.tags
}

resource "azurerm_role_assignment" "rg_reader" {
  scope                = module.resource_group.id
  role_definition_name = "Reader"
  principal_id         = module.managed_identity.principal_id
  description          = "Read all resources in ${module.resource_group.name}"
}

resource "azurerm_role_assignment" "key_vault_user" {
  scope                = module.resource_group.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.managed_identity.principal_id
}

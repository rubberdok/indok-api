module "managed_identity" {
  source = "../managed_identity"

  name                = "managed-identity-${var.suffix}"
  resource_group_name = module.resource_group.name
  tags                = local.tags
}

resource "azurerm_role_assignment" "service_principal" {
  scope                = module.resource_group.id
  role_definition_name = "Contributor"
  principal_id         = module.managed_identity.principal_id
  description          = "Manage all resources in the resource group ${module.resource_group.name}"
}

resource "azurerm_role_assignment" "service_principal" {
  scope                = module.resource_group.id
  role_definition_name = "Contributor"
  principal_id         = module.application.principal_id
}

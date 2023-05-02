resource "azurerm_role_assignment" "github_oidc" {
  scope                = module.resource_group.id
  role_definition_name = "Contributor"
  principal_id         = module.application.principal_id
}

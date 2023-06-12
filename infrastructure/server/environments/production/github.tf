locals {
  repository_name = "indok-api"
}


resource "github_repository_environment" "this" {
  environment = var.environment
  repository  = local.repository_name
}

resource "github_actions_environment_variable" "this" {
  for_each = {
    "azure_client_id"       = module.server.managed_identity.client_id,
    "azure_tenant_id"       = module.server.managed_identity.tenant_id,
    "azure_subscription_id" = data.azurerm_client_config.current.subscription_id,
  }
  repository    = local.repository_name
  variable_name = upper(each.key)
  environment   = github_repository_environment.this.environment
  value         = each.value
}

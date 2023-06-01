locals {
  repository_name = "indok-api"
}


resource "github_repository_environment" "this" {
  environment = local.environment_name
  repository  = local.repository_name
}

resource "github_actions_environment_variable" "azure_client_id" {
  repository    = local.repository_name
  variable_name = "AZURE_CLIENT_ID"
  environment   = github_repository_environment.this.environment
  value         = module.managed_identity.client_id
}

resource "github_actions_environment_variable" "azure_subscription_id" {
  repository    = local.repository_name
  variable_name = "AZURE_SUBSCRIPTION_ID"
  environment   = github_repository_environment.this.environment
  value         = data.azurerm_client_config.current.subscription_id
}

resource "github_actions_environment_variable" "azure_tenant_id" {
  repository    = local.repository_name
  variable_name = "AZURE_TENANT_ID"
  environment   = github_repository_environment.this.environment
  value         = module.managed_identity.tenant_id
}

locals {
  repository_name = "serverless"
}

resource "github_repository_environment" "environment" {
  environment = local.environment_name
  repository  = local.repository_name
}

resource "github_actions_environment_secret" "azure_client_id" {
  repository      = local.repository_name
  secret_name     = "AZURE_CLIENT_ID"
  environment     = github_repository_environment.environment.environment
  plaintext_value = module.application.application_id
}

resource "github_actions_environment_secret" "azure_subscription_id" {
  repository      = local.repository_name
  secret_name     = "AZURE_SUBSCRIPTION_ID"
  environment     = github_repository_environment.environment.environment
  plaintext_value = data.azurerm_client_config.current.subscription_id
}

resource "github_actions_environment_secret" "azure_tenant_id" {
  repository      = local.repository_name
  secret_name     = "AZURE_TENANT_ID"
  environment     = github_repository_environment.environment.environment
  plaintext_value = data.azurerm_client_config.current.tenant_id
}

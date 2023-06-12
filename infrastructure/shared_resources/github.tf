resource "github_actions_variable" "azure_client_id" {
  repository    = var.repository_name
  variable_name = "AZURE_CLIENT_ID"
  value         = azuread_application.github.application_id
}

resource "github_actions_variable" "azure_tenant_id" {
  repository    = var.repository_name
  variable_name = "AZURE_TENANT_ID"
  value         = azuread_service_principal.github.application_tenant_id
}

resource "github_actions_variable" "azure_subscription_id" {
  repository    = var.repository_name
  variable_name = "AZURE_SUBSCRIPTION_ID"
  value         = data.azurerm_client_config.current.subscription_id
}

resource "github_actions_secret" "azure_client_secret" {
  repository      = var.repository_name
  secret_name     = "AZURE_CLIENT_SECRET"
  plaintext_value = azuread_application_password.github.value
}

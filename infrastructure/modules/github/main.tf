terraform {
  required_providers {
    github = {
      source = "integrations/github"
    }
  }
}


resource "github_repository_environment" "environment" {
  environment = var.environment_name
  repository  = var.repository_name
}

resource "github_actions_environment_variable" "azure_client_id" {
  repository    = var.repository_name
  variable_name = "AZURE_CLIENT_ID"
  environment   = github_repository_environment.environment.environment
  value         = var.application_id
}

resource "github_actions_environment_variable" "azure_subscription_id" {
  repository    = var.repository_name
  variable_name = "AZURE_SUBSCRIPTION_ID"
  environment   = github_repository_environment.environment.environment
  value         = var.subscription_id
}

resource "github_actions_environment_variable" "azure_tenant_id" {
  repository    = var.repository_name
  variable_name = "AZURE_TENANT_ID"
  environment   = github_repository_environment.environment.environment
  value         = var.tenant_id
}

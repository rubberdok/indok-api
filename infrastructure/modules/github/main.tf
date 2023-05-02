terraform {
  required_providers {
    github = {
      source = "integrations/github"
    }
  }
}

provider "github" {
  owner        = "rubberdok"
  organization = "rubberdok"
}

resource "github_repository_environment" "environment" {
  environment = var.environment_name
  repository  = var.repository_name
}

resource "github_actions_environment_secret" "azure_client_id" {
  repository      = var.repository_name
  secret_name     = "AZURE_CLIENT_ID"
  environment     = github_repository_environment.environment.environment
  plaintext_value = var.application_id
}

resource "github_actions_environment_secret" "azure_subscription_id" {
  repository      = var.repository_name
  secret_name     = "AZURE_SUBSCRIPTION_ID"
  environment     = github_repository_environment.environment.environment
  plaintext_value = var.subscription_id
}

resource "github_actions_environment_secret" "azure_tenant_id" {
  repository      = var.repository_name
  secret_name     = "AZURE_TENANT_ID"
  environment     = github_repository_environment.environment.environment
  plaintext_value = var.tenant_id
}

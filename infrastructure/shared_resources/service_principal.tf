locals {
  azure_admin_id = "aebaf770-f990-4042-ba63-0bad65e6a23e"
}

resource "azuread_application" "github" {
  display_name = "github-cli"
  owners       = [local.azure_admin_id]

  required_resource_access {
    resource_app_id = data.azuread_application_published_app_ids.well_known.result.MicrosoftGraph

    resource_access {
      id   = azuread_service_principal.msgraph.app_role_ids["User.Read.All"]
      type = "Role"
    }
    resource_access {
      id   = azuread_service_principal.msgraph.app_role_ids["Application.ReadWrite.All"]
      type = "Role"
    }

  }
}

resource "azuread_service_principal" "github" {
  application_id               = azuread_application.github.application_id
  app_role_assignment_required = false
  owners                       = [local.azure_admin_id]
  description                  = "Service principal for GitHub actions"
}

resource "azuread_application_federated_identity_credential" "github_branch_main" {
  application_object_id = azuread_application.github.object_id
  display_name          = "github-branch-main"
  description           = "GitHub Actions Service Principal"
  audiences             = ["api://AzureADTokenExchange"]
  issuer                = "https://token.actions.githubusercontent.com"
  subject               = "repo:rubberdok/${var.repository_name}:branch:main"
}

resource "azuread_application_federated_identity_credential" "github_pull_request" {
  application_object_id = azuread_application.github.object_id
  display_name          = "github-pull-request"
  description           = "GitHub Actions Service Principal"
  audiences             = ["api://AzureADTokenExchange"]
  issuer                = "https://token.actions.githubusercontent.com"
  subject               = "repo:rubberdok/${var.repository_name}:pull_request"
}

resource "time_rotating" "yearly" {
  rotation_years = 1
  lifecycle {
    create_before_destroy = true
  }
}

resource "azuread_application_password" "github" {
  application_object_id = azuread_application.github.object_id
  display_name          = "github-actions"

  rotate_when_changed = {
    rotation = time_rotating.yearly.id
  }

  lifecycle {
    create_before_destroy = true
  }
}

data "azuread_application_published_app_ids" "well_known" {}


resource "azuread_service_principal" "msgraph" {
  application_id = data.azuread_application_published_app_ids.well_known.result.MicrosoftGraph
  use_existing   = true
}

resource "azuread_app_role_assignment" "github_app_rw_all" {
  app_role_id         = azuread_service_principal.msgraph.app_role_ids["Application.ReadWrite.All"]
  principal_object_id = azuread_service_principal.github.object_id
  resource_object_id  = azuread_service_principal.msgraph.object_id
}

resource "azuread_app_role_assignment" "github_users_read_all" {
  app_role_id         = azuread_service_principal.msgraph.app_role_ids["User.Read.All"]
  principal_object_id = azuread_service_principal.github.object_id
  resource_object_id  = azuread_service_principal.msgraph.object_id
}

resource "azurerm_role_assignment" "github_subscription_contributor" {
  scope                = "/subscriptions/${data.azurerm_client_config.current.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.github.object_id
}

locals {
  azure_admin_id = "aebaf770-f990-4042-ba63-0bad65e6a23e"
}

data "azurerm_subscription" "current" {}

# Application registration for Github Actions
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

# Service Principal, used by Github Actions to authenticate with Azure
resource "azuread_service_principal" "github" {
  client_id                    = azuread_application.github.client_id
  app_role_assignment_required = false
  owners                       = [local.azure_admin_id]
  description                  = "Service principal for GitHub actions"
}

/*
  Add federated identity credentials for Github to enable OIDC authentication,
  as described in https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
*/
resource "azuread_application_federated_identity_credential" "github_branch_main" {
  application_id = azuread_application.github.id
  display_name   = "github-branch-main"
  description    = "GitHub Actions Service Principal"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:rubberdok/${var.repository_name}:ref:refs/heads/main"
}

resource "azuread_application_federated_identity_credential" "github_environment_production" {
  application_id = azuread_application.github.id
  display_name   = "github-environment-production"
  description    = "GitHub Actions Service Principal"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:rubberdok/indok-api:environment:production"
}

resource "azuread_application_federated_identity_credential" "github_pull_request" {
  application_id = azuread_application.github.id
  display_name   = "github-pull-request"
  description    = "GitHub Actions Service Principal"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:rubberdok/${var.repository_name}:pull_request"
}

resource "time_rotating" "yearly" {
  rotation_years = 1
  lifecycle {
    create_before_destroy = true
  }
}

resource "azuread_application_password" "github" {
  application_id = azuread_application.github.id
  display_name   = "github-actions"

  rotate_when_changed = {
    rotation = time_rotating.yearly.id
  }

  lifecycle {
    create_before_destroy = true
  }
}

data "azuread_application_published_app_ids" "well_known" {}


resource "azuread_service_principal" "msgraph" {
  client_id    = data.azuread_application_published_app_ids.well_known.result.MicrosoftGraph
  use_existing = true
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


/*
  Extends the built-in Contributor role with the ability to to manage RBAC, which
  is required to assign roles to key vaults.
*/
resource "azurerm_role_definition" "custom_contributor" {
  name              = "Contributor with RBAC Management"
  scope             = data.azurerm_subscription.current.id
  description       = "Grants full access to manage all resources, allow you to assign and delete roles in Azure RBAC but does not allow you to manage assignments in Azure Blueprints, or share image galleries."
  assignable_scopes = [data.azurerm_subscription.current.id]
  permissions {
    actions = ["*"]
    not_actions = [
      "Microsoft.Authorization/elevateAccess/Action",
      "Microsoft.Blueprint/blueprintAssignments/write",
      "Microsoft.Blueprint/blueprintAssignments/delete",
      "Microsoft.Compute/galleries/share/action"
    ]

  }
}

# Assign the custom role to the Github service principal
resource "azurerm_role_assignment" "github_subscription_contributor" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = azurerm_role_definition.custom_contributor.name
  principal_id         = azuread_service_principal.github.object_id
}

# Assign the Key Vault Secrets Officer role to the Github service principal so that
# it can read and write secrets that are stored in the shared key vault.
resource "azurerm_role_assignment" "key_vault_officer" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azuread_service_principal.github.object_id
}

resource "azuread_application" "github_oidc" {
  display_name = var.display_name
}

resource "azuread_service_principal" "github_oidc" {
  application_id = azuread_application.github_oidc.application_id
}

resource "azuread_application_federated_identity_credential" "github_oidc" {
  application_object_id = azuread_application.github_oidc.object_id
  display_name          = "github-oidc"
  description           = "Deployments from indok-web"
  audiences             = ["api://AzureADTokenExchange"]
  issuer                = "https://token.actions.githubusercontent.com"
  subject               = "repo:${var.repository}:ref:refs/heads/${var.branch}"
}

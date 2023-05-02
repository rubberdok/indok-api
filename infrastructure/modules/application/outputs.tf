output "principal_id" {
  value = azuread_service_principal.github_oidc.id
}

output "application_id" {
  value = azuread_service_principal.github_oidc.application_id
}

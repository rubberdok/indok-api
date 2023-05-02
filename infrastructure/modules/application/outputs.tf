output "principal_id" {
  value = azuread_service_principal.service_principal.id
}

output "tenant_id" {
  value = azuread_service_principal.service_principal.application_tenant_id
}

output "application_id" {
  value = azuread_application.application.application_id
}

output "password" {
  value     = azuread_application_password.application_password.value
  sensitive = true
}

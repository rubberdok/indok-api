output "principal_id" {
  value = data.azuread_service_principal.service_principal.id
}

output "tenant_id" {
  value = data.azuread_service_principal.service_principal.application_tenant_id
}

output "application_id" {
  value = data.azuread_application.application.application_id
}


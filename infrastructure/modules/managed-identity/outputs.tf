output "principal_id" {
  value = azurerm_user_assigned_identity.managed_identity.principal_id
}

output "tenant_id" {
  value = azurerm_user_assigned_identity.managed_identity.tenant_id
}

output "client_id" {
  value = azurerm_user_assigned_identity.managed_identity.client_id
}

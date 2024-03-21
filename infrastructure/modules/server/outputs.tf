output "managed_identity" {
  value = module.managed_identity
}

output "fqdn" {
  value = azurerm_container_app.server.ingress[0].fqdn
}
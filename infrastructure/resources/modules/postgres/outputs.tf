output "fqdn" {
  value     = azurerm_postgresql_server.this.fqdn
  sensitive = true
}

output "connection_string" {
  value     = "postgresql://${var.administrator_login}:${var.administrator_login_password}@${azurerm_postgresql_server.this.fqdn}"
  sensitive = true
}

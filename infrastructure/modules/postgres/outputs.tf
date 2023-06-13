output "connection_string" {
  value     = "postgresql://${var.administrator_login}:${var.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}/${azurerm_postgresql_flexible_server_database.this.name}?sslmode=require&sslcert=./BaltimoreCyberTrustRoot.crt.pem"
  sensitive = true
}

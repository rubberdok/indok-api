output "connection_string" {
  value     = "postgresql://${var.administrator_login}:${var.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}/postgres?sslmode=require&sslcert=./DigiCertGlobalRootCA.crt.pem"
  sensitive = true
}

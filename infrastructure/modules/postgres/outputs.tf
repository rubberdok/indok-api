output "connection_string" {
  value     = "postgresql://${var.authentication.administrator_login}:${var.authentication.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}/postgres?sslmode=require&sslcert=./DigiCertGlobalRootCA.crt.pem"
  sensitive = true
}

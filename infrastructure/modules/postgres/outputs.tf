output "connection_string" {
  value     = "postgres://${var.administrator_login}:${var.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}/postgres?sslmode=verify-full&sslrootcert=./DigiCertGlobalRootCA.crt.pem"
  sensitive = true
}

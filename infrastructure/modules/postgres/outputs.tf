output "connection_string" {
  value       = "postgresql://${var.authentication.administrator_login}:${var.authentication.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/postgres?sslmode=require&sslcert=/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem"
  sensitive   = true
  description = "JavaScript connection string for the PostgreSQL Flexible Server."
}

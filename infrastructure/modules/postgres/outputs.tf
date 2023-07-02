output "connection_string" {
  value       = "postgresql://${var.authentication.administrator_login}:${var.authentication.administrator_password}@${azurerm_private_dns_zone.this.soa_record[0].fqdn}/postgres?sslmode=require&sslcert=./DigiCertGlobalRootCA.crt.pem"
  sensitive   = true
  description = "JavaScript connection string for the PostgreSQL Flexible Server."
}

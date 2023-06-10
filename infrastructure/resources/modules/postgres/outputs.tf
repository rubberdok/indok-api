output "connection_string" {
  value     = "postgresql://${var.administrator_login}:${var.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}?sslmode=require&sslcert=./BaltimoreCyberTrustRoot.crt.pem"
  sensitive = true
}

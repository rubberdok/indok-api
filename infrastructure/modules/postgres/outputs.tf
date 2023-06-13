output "connection_string" {
  value     = "postgres://${var.administrator_login}:${var.administrator_password}@${azurerm_postgresql_flexible_server.this.fqdn}/postgres?sslmode=require&sslcert=./BaltimoreCyberTrustRoot.crt.pem"
  sensitive = true
}


output "secrets" {
  value = {
    "postgres_password" = azurerm_key_vault_secret.postgres_password.id
  }
  sensitive = true
}


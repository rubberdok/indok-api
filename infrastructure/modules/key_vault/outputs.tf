
data "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres_password"
  key_vault_id = azurerm_key_vault.key_vault.id
}

output "secrets" {
  value = {
    "postgres_password" = data.azurerm_key_vault_secret.postgres_password.value
  }
  sensitive = true
}


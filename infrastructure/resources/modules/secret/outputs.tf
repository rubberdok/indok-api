output "postgres_password" {
  value = {
    name            = azurerm_key_vault_secret.postgres_password.name
    plaintext_value = azurerm_key_vault_secret.postgres_password.value
  }
  sensitive = true
}

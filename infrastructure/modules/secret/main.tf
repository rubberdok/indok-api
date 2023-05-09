resource "random_password" "password" {
  length      = 128
  special     = true
  min_lower   = 1
  min_numeric = 1
  min_upper   = 1
  min_special = 1
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-password"
  value        = random_password.password.result
  key_vault_id = var.key_vault_id
}

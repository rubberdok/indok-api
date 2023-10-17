resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "db-connection-string"
  value        = module.database.connection_string
  key_vault_id = module.key_vault.id
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "redis-connection-string"
  value        = module.redis.connection_string
  key_vault_id = module.key_vault.id
}

resource "random_password" "session_secret_value" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "session_secret" {
  name         = "session-secret"
  value        = random_password.session_secret_value.result
  key_vault_id = module.key_vault.id
}

data "azurerm_key_vault_secret" "feide_client_secret" {
  key_vault_id = "https://shared-key-vault-altht.vault.azure.net/"
  name         = "feide-client-secret"
}

data "azurerm_key_vault_secret" "postman_api_token" {
  key_vault_id = "https://shared-key-vault-altht.vault.azure.net/"
  name         = "postman-api-token"
}

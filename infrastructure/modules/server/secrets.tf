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

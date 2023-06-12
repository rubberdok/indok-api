output "connection_string" {
  value     = "redis://default:${azurerm_redis_cache.this.primary_access_key}@${azurerm_redis_cache.this.hostname}:${azurerm_redis_cache.this.port}"
  sensitive = true
}

output "connection_string" {
  value     = azurerm_redis_cache.this.primary_connection_string
  sensitive = true
}

resource "azurerm_storage_account" "main" {
  min_tls_version          = "TLS1_2"
  name                     = var.name
  resource_group_name      = var.resource_group.name
  location                 = var.resource_group.location
  account_tier             = var.account_tier
  account_replication_type = var.account_replication_type
  blob_properties {
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "DELETE", "PUT", "HEAD", "MERGE", "POST", "OPTIONS", "PUT", "PATCH"]
      allowed_origins    = ["http://localhost:3000", "localhost:3000"]
      exposed_headers    = ["x-ms-meta-*"]
      max_age_in_seconds = 3600
    }
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }
}


resource "azurerm_storage_container" "main" {
  name                  = "${var.name}container"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

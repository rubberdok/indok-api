resource "azurerm_storage_account" "main" {
  min_tls_version          = "TLS1_2"
  name                     = var.name
  resource_group_name      = var.resource_group.name
  location                 = var.resource_group.location
  account_tier             = var.account_tier
  account_replication_type = var.account_replication_type

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

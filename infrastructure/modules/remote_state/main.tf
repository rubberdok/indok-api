/*
  Resources to manage and store the Terraform state remotely.
*/

resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}


resource "azurerm_storage_account" "tfstate" {
  name                            = "tfstate${random_string.resource_code.result}"
  resource_group_name             = var.resource_group.name
  location                        = var.resource_group.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"

  lifecycle {
    prevent_destroy = true
  }
}

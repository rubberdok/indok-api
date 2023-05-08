# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
resource "azurerm_storage_account" "function" {
  name                = var.resource_name
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location

  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = var.tags
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
resource "azurerm_service_plan" "function" {
  name                = var.resource_name
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location
  os_type             = "Linux"

  sku_name = var.sku_name

  tags = var.tags
}

resource "azurerm_linux_function_app" "function" {
  name                = var.name
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location

  storage_account_name = azurerm_storage_account.function.name
  service_plan_id      = azurerm_service_plan.function.id

  storage_uses_managed_identity = true

  key_vault_reference_identity_id = var.identity_id

  site_config {}

  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }

  tags = var.tags
}

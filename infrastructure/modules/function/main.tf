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

resource "azurerm_log_analytics_workspace" "function" {
  name                = "${var.name}-workspace"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name

  sku               = "PerGB2018"
  retention_in_days = 30
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights
resource "azurerm_application_insights" "function" {
  name                = "${var.name}-insights"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name
  application_type    = "Node.JS"
  workspace_id        = azurerm_log_analytics_workspace.function.id
}


locals {
  function_app_settings = {for secret in var.secrets : secret.name => "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${secret.key})"}
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app#storage_uses_managed_identity
resource "azurerm_linux_function_app" "function" {
  name                = var.name
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location

  storage_account_name       = azurerm_storage_account.function.name
  storage_account_access_key = azurerm_storage_account.function.primary_access_key
  service_plan_id            = azurerm_service_plan.function.id


  key_vault_reference_identity_id = var.identity_id

  app_settings = merge({
    "WEBSITE_RUN_FROM_PACKAGE" = "",
    "FUNCTIONS_WORKER_RUNTIME" = "node" 
  }, local.function_app_settings)


  site_config {
    always_on = var.always_on
    application_stack {
      node_version = "18"
    }

    application_insights_key = azurerm_application_insights.function.instrumentation_key
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
    ]
  }
}

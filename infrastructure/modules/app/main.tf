# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
resource "azurerm_service_plan" "web_app" {
  name                = var.resource_name
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location
  os_type             = "Linux"

  sku_name = var.sku_name

  tags = var.tags
}

resource "azurerm_log_analytics_workspace" "web_app" {
  name                = "${var.name}-workspace"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name

  sku               = "PerGB2018"
  retention_in_days = 30
}

locals {
  web_app_settings = {for secret in var.secrets : secret.name => "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${secret.key})"}
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app#storage_uses_managed_identity
resource "azurerm_linux_web_app" "web_app" {
  name                = var.name
  resource_group_name = var.resource_group.name
  location            = var.resource_group.location

  service_plan_id            = azurerm_service_plan.web_app.id

  key_vault_reference_identity_id = var.identity_id

  app_settings = merge({}, local.web_app_settings)


  site_config {
    application_stack {
      docker_image =  "ghcr.io/rubberdok/server"
      docker_image_tag = "a57847c994f11897287cbd54b3ac7edb897bb8ed"
    }
  }


  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }

  tags = var.tags
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace
resource "azurerm_log_analytics_workspace" "this" {
  name                = "ca-log-workspace-${var.suffix}"
  location            = var.resource_group.location
  resource_group_name = var.resource_group.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Create a subnet in our Virtual Network on Azure and delegate it to our Container App, so that it can
# access the database and other resources on the virtual network.
resource "azurerm_subnet" "this" {
  name                 = "ca-subnet-${var.suffix}"
  resource_group_name  = var.resource_group.name
  virtual_network_name = var.network.virtual_network_name
  address_prefixes     = ["10.0.0.0/21"]
}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment
resource "azurerm_container_app_environment" "this" {
  name                       = "ca-env-${var.suffix}"
  location                   = var.resource_group.location
  resource_group_name        = var.resource_group.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  infrastructure_subnet_id   = azurerm_subnet.this.id

  tags = var.tags
}

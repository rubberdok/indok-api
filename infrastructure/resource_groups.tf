module "resource_group" {
  source = "./modules/resource-group"

  name = local.environment_name

  tags = {
    workspace   = terraform.workspace
    environment = var.environment
  }
}

module "blob_storage" {
  source = "../../modules/blob_storage"

  name = "appstore${var.suffix}"

  resource_group = module.resource_group
  tags           = local.tags
}

module "blob_storage" {
  source = "../../modules/blob_storage"

  name = "appstore${var.suffix}"

  identity_id     = module.managed_identity.id
  resource_group  = module.resource_group
  tags            = local.tags
  allowed_origins = var.blob_storage.allowed_origins
}

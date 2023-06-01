module "secret" {
  source = "./modules/secret"

  key_vault_id = module.key_vault.id
}

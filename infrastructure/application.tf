module "application" {
  source = "./modules/application"

  secret_name = local.environment_name
}

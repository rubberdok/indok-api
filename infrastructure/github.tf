module "github" {
  source = "./modules/github"

  environment_name = local.environment_name
  repository_name  = "serverless"

  client_secret   = module.application.password
  tenant_id       = data.azurerm_client_config.current.tenant_id
  subscription_id = data.azurerm_client_config.current.subscription_id
  application_id  = module.application.application_id

  providers = {
    github = github
  }
}

module "application" {
  source = "./modules/application"

  display_name = "indok-web"
  repository   = "rubberdok/serverless"
}

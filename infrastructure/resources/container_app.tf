module "container_app" {
  source = "./modules/container_app"

  name = local.environment_name
  tags = local.tags

  resource_group = {
    name     = module.resource_group.name
    location = module.resource_group.location
  }

  docker_registry_server_url = "ghcr.io"
  docker_registry_username   = "USERNAME"
  docker_registry_password   = var.docker_registry_password

  envs = [
    {
      name  = "CORS_ORIGINS"
      value = "https://indokntnu.no"
    },
    {
      name  = "CORS_CREDENTIALS"
      value = "true"
    },
    {
      name  = "NODE_ENV"
      value = "production"
    },
    {
      name  = "NO_REPLY_EMAIL"
      value = "no-reply@indokntnu.no"
    },
    {
      name  = "DATABASE_URL"
      value = ""
    },
    {
      name  = "PORT"
      value = 4000
    },
    {
      name  = "FEIDE_CLIENT_ID"
      value = "abc"
    }
  ]
}

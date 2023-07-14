locals {
  repository_name = "indok-api"
}


resource "github_repository_environment" "this" {
  environment = var.environment
  repository  = local.repository_name
}


variable "environment_variables" {
  type = list(object({
    name        = string
    secret_name = optional(string)
    value       = optional(string)
  }))
  default = []
}

variable "secrets" {
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "docker_registry_password" {
  type      = string
  sensitive = true
  default   = ""
}

variable "environment" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "ghcr.io/rubberdok/server:latest"
}

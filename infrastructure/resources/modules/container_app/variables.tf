variable "name" {
  type        = string
  description = "The name of the container app."
}

variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
}

variable "container" {
  type = object({
    cpu    = number
    memory = string
  })
  default = {
    cpu    = 0.25
    memory = "0.5Gi"
  }
}

variable "tags" {
  type = map(string)
}

variable "docker_image_tag" {
  type    = string
  default = "ghcr.io/rubberdok/server:1159fe47b6b4c83a5a41f3eae07cda3736394d3a"
}

variable "docker_registry_server_url" {
  type = string
}

variable "docker_registry_password" {
  type      = string
  sensitive = true
}

variable "docker_registry_username" {
  type = string
}

variable "envs" {
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

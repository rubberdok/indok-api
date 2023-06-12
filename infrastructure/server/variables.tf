variable "environment" {
  type        = string
  default     = "test"
  description = "The environment to deploy to"
}

variable "postgres" {
  type = object({
    sku_name   = string
    storage_mb = number
  })
}

variable "docker_registry_password" {
  type      = string
  sensitive = true
}

variable "redis" {
  type = object({
    sku_name = string
    family   = string
    capacity = string
  })
  default = {
    sku_name = "Basic"
    family   = "C"
    capacity = "0"
  }
}

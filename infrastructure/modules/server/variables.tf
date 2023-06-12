variable "suffix" {
  type        = string
  description = "Suffix to append to the name of the resources"
}

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
}


variable "postgres" {
  type = object({
    sku_name   = string
    storage_mb = number
  })
  default = {
    sku_name   = "B_Standard_B1ms"
    storage_mb = 32768
  }
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

variable "environment" {
  type = string
}
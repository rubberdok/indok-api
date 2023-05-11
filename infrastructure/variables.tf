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

variable "app_service" {
  type = object({
    sku_name = string
  })
}


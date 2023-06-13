variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
}

variable "postgres" {
  type = object({
    sku_name   = string
    storage_mb = number
  })
}

variable "authentication" {
  type = object({
    administrator_login    = string
    administrator_password = string
  })
  sensitive = true
}

variable "network" {
  type = object({
    virtual_network_name = string
  })
}

variable "tags" {
  type = map(string)
}


variable "suffix" {
  type        = string
  description = "The suffix to append to the resources."
}

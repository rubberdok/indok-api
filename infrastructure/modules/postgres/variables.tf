variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
  description = "The resource group to deploy the resources."
}

variable "postgres" {
  type = object({
    sku_name   = string
    storage_mb = number
  })
  description = "The configuration of the PostgreSQL server."
}

variable "authentication" {
  type = object({
    administrator_login    = string
    administrator_password = string
  })
  sensitive   = true
  description = "The authentication configuration of the PostgreSQL server."
}

variable "network" {
  type = object({
    virtual_network_name = string
    virtual_network_id   = string
    address_prefixes     = list(string)
  })
  description = "The network configuration of the PostgreSQL server."
}

variable "tags" {
  type = map(string)
}


variable "suffix" {
  type        = string
  description = "The suffix to append to the resources."
}

variable "prefix" {
  type = string
}

variable "environment" {
  type = string
}

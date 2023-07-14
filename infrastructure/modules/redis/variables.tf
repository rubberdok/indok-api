variable "sku_name" {
  type = string
}

variable "family" {
  type = string
}

variable "capacity" {
  type = string
}

variable "name" {
  type = string
}

variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
}


variable "tags" {
  type = map(string)
}

variable "network" {
  type = object({
    virtual_network_name = string
    virtual_network_id   = string
  })
  description = "The network configuration of the PostgreSQL server."
}

variable "suffix" {
  type = string
}

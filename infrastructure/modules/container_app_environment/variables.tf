variable "suffix" {
  type = string
}

variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
}

variable "network" {
  type = object({
    virtual_network_name = string
  })
}

variable "tags" {
  type = map(string)
}

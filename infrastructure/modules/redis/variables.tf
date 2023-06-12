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

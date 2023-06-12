variable "name" {
  type        = string
  description = "The name of the managed identity."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the managed identity."
}

variable "tags" {
  type = map(string)
}
variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the PostgreSQL Server."
}

variable "sku_name" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "administrator_password" {
  type        = string
  description = "The password for the PostgreSQL Server administrator."
  sensitive   = true
}

variable "administrator_login" {
  type        = string
  description = "The administrator login name for the PostgreSQL Server."
}

variable "storage_mb" {
  type        = number
  description = "The amount of storage allocated to this PostgreSQL Server."
}

variable "name" {
  type        = string
  description = "The name of the PostgreSQL Server."
}

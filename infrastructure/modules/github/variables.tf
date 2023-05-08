variable "repository_name" {
  type = string
}

variable "environment_name" {
  type = string
}

variable "application_id" {
  type      = string
  sensitive = true
}

variable "subscription_id" {
  type = string
}

variable "tenant_id" {
  type = string
}


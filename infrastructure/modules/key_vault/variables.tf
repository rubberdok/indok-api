variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
  description = "The resource group in which to create the key vault."
}

variable "tags" {
  type = map(string)
}

variable "tenant_id" {
  type        = string
  description = "The Azure Active Directory tenant ID that should be used for authenticating requests to the key vault."
}

variable "principal_id" {
  type = string
}

variable "name" {
  type        = string
  description = "The name of the key vault."
}

variable "current_service_principal" {
  type = object({
    object_id = string
  })
}


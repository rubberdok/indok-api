variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the key vault."
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
    tenant_id = string
    object_id = string
  })
}

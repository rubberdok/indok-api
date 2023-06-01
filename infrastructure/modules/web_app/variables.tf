variable "resource_group" {
  description = "The resource group in which to create the resources."
  type = object({
    name     = string
    location = string
  })
}

variable "name" {
  description = "The name of the web app."
  type        = string
}

variable "sku_name" {
  description = "The SKU name of the web app. https://azure.microsoft.com/en-gb/pricing/details/app-service/linux/"
  type        = string
  default     = "F1"
}


variable "identity_id" {
  description = "The identity id of the web app."
  type        = string
}

variable "tags" {
  description = "The tags to apply to all resources in this module."
  type        = map(string)
}

variable "resource_name" {
  description = "A unqiue name for the supporting resources in this module."
  type        = string
}


variable "key_vault_name" {
  description = "The name of the key vault to use for secrets."
  type        = string
}

variable "secrets" {
  description = "The keys of the secrets to retrieve from the key vault."
  type = list(object({
    key  = string
    name = string
  }))
}

variable "docker_image" {
  description = "The Docker image reference, including repository host as needed."
  type        = string
  default     = "ghcr.io/rubberdok/server"
}

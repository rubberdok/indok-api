variable "resource_group" {
  description = "The resource group in which to create the resources."
  type = object({
    name     = string
    location = string
  })
}

variable "name" {
  description = "The name of the function app."
  type        = string
}

variable "sku_name" {
  description = "The SKU name of the function app. https://azure.microsoft.com/en-gb/pricing/details/app-service/linux/"
  type        = string
  default     = "F1"
}


variable "identity_id" {
  description = "The identity id of the function app."
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

variable "always_on" {
  description = "Should the function app be always on to improve cold start times?"
  type        = bool
  default     = false
}
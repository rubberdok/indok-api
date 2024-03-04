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


variable "name" {
  type        = string
  description = "The name of the blob storage."
}

variable "account_replication_type" {
  type        = string
  description = "The type of replication to use for the storage account."
  default     = "LRS"
}

variable "account_tier" {
  type        = string
  description = "The tier of the storage account."
  default     = "Standard"
}

variable "identity_id" {
  type        = string
  description = "The ID of the user-assigned identity to assign to the storage account."

}

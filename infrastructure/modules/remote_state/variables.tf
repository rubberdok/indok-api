variable "tags" {
  type        = map(string)
  description = "Tags to apply to the storage account"
}

variable "resource_group" {
  type = object({
    name     = string
    location = string
  })
}

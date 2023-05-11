variable "resource_group" {
    type = object({
        name     = string
        location = string
    })
}
variable "resource_prefix" {
    type = string
}
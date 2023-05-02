variable "repository" {
  type = string
}

variable "display_name" {
  type        = string
  description = "Application display name"
}

variable "branch" {
  type        = string
  description = "Branch to deploy"
  default     = "main"
}

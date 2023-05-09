output "function_app_name" {
  description = "The name of the function app."
  value       = module.function.app_name
}

output "function_app_default_hostname" {
  description = "The default hostname of the function app."
  value       = module.function.default_hostname
}

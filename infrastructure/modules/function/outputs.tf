output "app_name" {
  description = "The name of the function app."
  value       = azurerm_linux_function_app.function.name
}

output "default_hostname" {
  description = "The default hostname of the function app."
  value       = azurerm_linux_function_app.function.default_hostname
}

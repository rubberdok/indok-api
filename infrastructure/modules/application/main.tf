data "azuread_application" "application" {
  display_name = "indok-web"
}


data "azuread_service_principal" "service_principal" {
  application_id = data.azuread_application.application.application_id
}


resource "azuread_application_password" "application_password" {
  display_name          = var.secret_name
  application_object_id = data.azuread_application.application.object_id
}

data "azuread_application" "application" {
  display_name = "indok-web"
}


data "azuread_service_principal" "service_principal" {
  application_id = data.azuread_application.application.application_id
}

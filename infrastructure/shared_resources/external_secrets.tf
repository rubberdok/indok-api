resource "azurerm_key_vault_secret" "external" {
  for_each = toset(["feide-client-secret", "postmark-api-token"])

  name  = each.key
  value = "<redacted>"

  key_vault_id = azurerm_key_vault.shared.id

  lifecycle {
    ignore_changes = [value]
  }
}

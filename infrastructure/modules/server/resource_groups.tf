module "resource_group" {
  source = "../resource_group"

  name = "rg-${var.suffix}"

  tags = local.tags
}

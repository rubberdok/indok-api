# Description

This module was used to set up the required resources for storing Terraform state in Azure Storage.
It was set up following the steps in [Store Terraform State in Azure Storage](https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage?tabs=azure-cli) with minor alterations.

An important note is that the state for this module is not stored, so running `terraform apply` in this module
will recreate the resources.

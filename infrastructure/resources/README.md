# Introduction

This directory is responsible for managing **all** infrastructure related to `serverless`. It uses [Terraform](https://www.terraform.io), an infrastructure as code (IaC) provider.

## Motivation

Managing infrastructure through the web portals for Azure, AWS, etc. can be tricky, and whatever changes are made
are not recorded. As such, it quickly results in resources that are unused, or configurations that have no
documentation or explanations. Managing infrastructure through IaC means that our infrastructure is version controlled,
and as a result, any additions or changes are easier to track. Furthermore, it greatly simplifies multiple deployments,
and enables preview deployments of pull requests to increase confidence.

Lastly, it is a highly relevant skill to learn.

## Directory Structure

`main.tf` is the entrypoint, the modules defined here are the ones that are managed by Terraform.
`modules` contains the modules for our project, including resource groups, databases, etc.
`variables.tf` defines a set of variables, and the corresponding variables are set in `*.tfvars` depending
on the environemnt.

We separate between `environment`, which is the set of variables (`*.tfvars`) used for a given set of infrastructure, and `workspace`,
which is the Terraform workspace for a given set of infrastructure.

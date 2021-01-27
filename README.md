# Azure Pipelines Extension for Terraform

[![Build status](https://dev.azure.com/chzipp/azure-pipelines-tasks-terraform/_apis/build/status/azure-pipelines-tasks-terraform)](https://dev.azure.com/chzipp/azure-pipelines-tasks-terraform/_build/latest?definitionId=11)
![Visual Studio Marketplace Installs - Azure DevOps Extension](https://img.shields.io/visual-studio-marketplace/azure-devops/installs/total/charleszipp.azure-pipelines-tasks-terraform?label=marketplace%20installs)

This contains tasks for installing and executing Terraform commands from Azure Pipelines. These extensions are intended to work on any build agent. They are also intended to provide a guided abstraction to deploying infrastructure with Terraform from Azure Pipelines.

The two tasks contained within this extension are

- [Terraform Installer](/tasks/terraform-installer/readme.md)
- [Terraform CLI](/tasks/terraform-cli/readme.md)

### Disabling Telemetry Collection

Telemetry collection can be disabled by setting the `allowTelemetryCollection` property to `false`.

From classic pipeline editor, uncheck the `Allow Telemetry Collection` checkbox to disable
telemetry collection.

### Preferred Languages

We prefer all communications to be in English.

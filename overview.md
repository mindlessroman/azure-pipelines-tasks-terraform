# Terraform Tasks for Azure DevOps

The tasks in this extension allow for running terraform cli commands from both the Build and Release pipelines in Azure DevOps. The motivation for this extension was to provide terraform pipeline tasks that could execute on all build agent operating systems and provide contextual/guided task configuration.

## Supported Commands

The Terraform CLI task supports executing the following commands

- version
- init
- validate
- plan
- apply
- destroy
- show
- refresh
- import
- output

## Terraform Output to Pipeline Variables

The TerraformCLI task supports running terraforms `output` command. When this is run, pipeline variables will be created from each output variable emitted from the `terraform output` command. Sensitive variables will be set as secret pipeline variables and their values will not be emitted to the pipeline logs.

For example, an output variable named `some_string`  will set a pipeline variable named `TF_OUT_SOME_STRING`.

This feature currently only supports primitive types `string`, `bool`, and `number`. Complex typed outputs such as `tuple` and `object` will be excluded from the translation.

## Compatible with Linux Build Agents

The tasks can execute on all supported build agent operating systems **including Ubuntu and MacOS**.

## Separate Task for Terraform Installation

The dedicated `Terraform Installer` task allows for complete control over how frequently and on which agents terraform is installed. This prevents from having to install terraform before executing each terraform task. However, if necessary, this can be installed multiple times to support pipelines that span multiple build agents

![Terraform Installer Task Definition](https://raw.githubusercontent.com/charleszipp/azure-pipelines-tasks-terraform/master/screenshots/overview-tfinstall-task-fields.jpg)

### Support for Installing `Latest` Version

The installer task supports installing the latest terraform version by using the keyword `latest` as the version specified. This is the default option when the installer is added to a pipeline. Specifying latest will instruct the task to lookup and install the latest version of the terraform executable.

## Contextual Task Configuration

The task definition will adjust to the selected command to prompt for what is relevant to the command. For example, `validate` does not require knowledge of the backend configuration so this section will not be used when executing `validate`. The `validate` command does accept vars file however. Therefore, the field to specify vars file will be available.

## Azure Service Connection / Service Principal Integration

When executing `plan`, `apply`, `destroy`, and `refresh` commands, the task will prompt for the target azure subscription to use. This is specified as a service connection/principal for deploying azure resources.

![Terraform Azure Environment Subscription](https://raw.githubusercontent.com/charleszipp/azure-pipelines-tasks-terraform/master/screenshots/overview-tfcli-azure-sub.jpg)

## Remote, Local and Self-configured Backend State Support

The task currently supports the following backend configurations

- local (default for terraform) - State is stored on the agent file system.
- azurerm - State is stored in a blob container within a specified Azure Storage Account.
- self-configured - State configuration will be provided using environment variables or command options. Environment files can be provided using Secure Files Library in AzDO and specified in Secure Files configuration field. Command options such as `-backend-config=` flag can be provided in the Command Options configuration field.

The backend configuration will be prompted when relevant for the selected command. If azurerm selected, the task will prompt for a service connection and storage account details to use for the backend.

![Terraform AzureRM Backend Configuration](https://raw.githubusercontent.com/charleszipp/azure-pipelines-tasks-terraform/master/screenshots/overview-tfcli-backend-azurerm.jpg)

### Automated Remote Backend Creation

The task supports automatically creating the resource group, storage account, and container for remote azurerm backend. To enable this, select the task for the terraform init command. Check the checkbox labled "Create Backend (If not exists)" underneath the backend type drop down. Once selected, the resource group location and storage account sku can be provided. The defaults are 'eastus' and 'Standard_RAGRS' respectively. The task will utilize AzureCLI to create the resource group, storage account, and container as specified in the backend configuration.

![Terraform AzureRM Create Backend](https://raw.githubusercontent.com/charleszipp/azure-pipelines-tasks-terraform/master/screenshots/overview-tfcli-ensure-backend.jpg)

## Secure Variable Secrets

There are three methods to provide secrets within the vars provided to terraform commands. First, if providing individual `-var` options to the command line, the secret pipeline variables can be used. Use the Command Options field to input your secret vars as `-var 'secret=$(mySecretPipelineVar)`. Secondly, a var file secured in Secure Files Library of Azure DevOps pipeline can be specified via drop-down menu. Storing sensitive var files in the Secure Files Library not only provides encryption at rest, it also allows the files to have different access control applied than that of the Source Repository and Build/Release Pipelines.

### Secure Env Files (NEW)

If the Secure Variables file name is `*.env`, it is referred as `.env` file. This task loads environment variables from the `.env` file.

#### _.env file example_

```bash
KEY1=VALUE1
KEY2=VALUE2
```

![Terraform CLI Secure Vars and Var Files](https://raw.githubusercontent.com/charleszipp/azure-pipelines-tasks-terraform/master/screenshots/overview-tfcli-secure-vars.JPG)

## Terraform Plan Change Detection

When running terraform plan with `-detailed-exitcode`, a pipeline variable will be set to indicate if any changes exist in the plan. `TERRAFORM_PLAN_HAS_CHANGES` will be set to `true` if plan detected changes. Otherwise, this variable will be set to `false`. This can be used in conjunction with `Custom Condition` expression under `Control Options` tab of the task to skip terraform apply if no changes were detected.

Sample expression
```
and(succeeded(), eq(variables['TERRAFORM_PLAN_HAS_CHANGES'], 'true'))
```

## Terraform Plan Destroy Detection

The task now has the ability to set a pipeline variable `TERRAFORM_PLAN_HAS_DESTROY_CHANGES` if a generated plan has destroy operations. To utilize this, run terraform plan and set the `-out=my-plan-file-path` to write the generated plan to a file. Then run `terraform show` and provide the path to the generated plan file in the `Target Plan or State File Path` input field. If show, detects a destroy operation within the plan file, then the pipeline variable `TERRAFORM_PLAN_HAS_DESTROY_CHANGES` will be set to true.

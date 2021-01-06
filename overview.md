# Terraform Tasks for Azure Pipelines

The tasks in this extension allow for running terraform cli commands from Azure Pipelines. The motivation for this extension was to provide terraform pipeline tasks that could execute on all build agent operating systems and provide guided task configuration.

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
- force-unlock
- fmt



## Compatible with Linux Build Agents

The tasks can execute on all supported build agent operating systems **including Ubuntu and MacOS**.

## Separate Task for Terraform Installation

The dedicated `Terraform Installer` task allows for complete control over how frequently and on which agents terraform is installed. This prevents from having to install terraform before executing each terraform task. However, if necessary, this can be installed multiple times to support pipelines that span multiple build agents

### Install Latest Version

The installer task supports installing the latest terraform version by using the keyword `latest` as the version specified. This is the default option when the installer is added to a pipeline. Specifying latest will instruct the task to lookup and install the latest version of the terraform executable.

```yaml
- task: TerraformInstaller
    displayName: install terraform
```

```yaml
- task: TerraformInstaller
    displayName: install terraform
    inputs:
        terraformVersion: latest
```

### Install Specific Version

```yaml
- task: TerraformInstaller
    displayName: install terraform
    inputs:
        terraformVersion: 0.14.3
```

## Contextual Task Configuration

The task definition will adjust to the selected command to prompt for what is relevant to the command. For example, `validate` does not require knowledge of the backend configuration so this section will not be used when executing `validate`. The `validate` command does accept vars file however. Therefore, the field to specify vars file will be available.

## Azure Service Connection / Service Principal Integration

When executing commands that interact with Azure such as `plan`, `apply`, and `destroy`, the task will utilize an Azure Service Connection to authorize operations against the target subscription. This is specified via the `environmentServiceName` input

```yaml
- task: TerraformCLI
    displayName: 'terraform apply'
    inputs:
        command: apply
        environmentServiceName: 'My Azure Service Connection'
```

## Remote, Local and Self-configured Backend State Support

The task currently supports the following backend configurations

- local (default for terraform) - State is stored on the agent file system.
- azurerm - State is stored in a blob container within a specified Azure Storage Account.
- self-configured - State configuration will be provided using environment variables or command options. Environment files can be provided using Secure Files Library in AzDO and specified in Secure Files configuration field. Command options such as `-backend-config=` flag can be provided in the Command Options configuration field.

If azurerm selected, the task will prompt for a service connection and storage account details to use for the backend.

```yaml
- task: TerraformCLI
    displayName: 'terraform init'
    inputs:
        command: init
        backendType: azurerm
        backendServiceArm: 'My Azure Service Connection'
        # create backend storage account if doesn't exist
        ensureBackend: true
        backendAzureRmResourceGroupName: 'my-backend-resource-group'
        # azure location shortname of the backend resource group and storage account
        backendAzureRmResourceGroupLocation: 'eastus'
        backendAzureRmStorageAccountName: 'my-backend-storage-account'
        # azure storage account sku, used when creating the storage account
        backendAzureRmStorageAccountSku: 'Standard_RAGRS'
        # azure blob container to store the state file
        backendAzureRmContainerName: 'my-backend-blob-container'
        # azure blob file name
        backendAzureRmKey: infrax.tfstate
```

### Automated Remote Backend Creation

The task supports automatically creating the resource group, storage account, and container for remote azurerm backend. To enable this, set the `ensureBackend` input to `true` and provide the resource group, location, and storage account sku. The defaults are 'eastus' and 'Standard_RAGRS' respectively. The task will utilize AzureCLI to create the resource group, storage account, and container as specified in the backend configuration.

## Secure Variable Secrets

There are three methods to provide secrets within the vars provided to terraform commands. First, if providing individual `-var` options to the command line, the secret pipeline variables can be used. Use the Command Options field to input your secret vars as `-var 'secret=$(mySecretPipelineVar)`. Secondly, a var file secured in Secure Files Library of Azure DevOps pipeline can be specified via drop-down menu. Storing sensitive var files in the Secure Files Library not only provides encryption at rest, it also allows the files to have different access control applied than that of the Source Repository and Build/Release Pipelines.

```yaml
- task: TerraformCLI@0
    displayName: 'terraform plan'
    inputs:
        command: plan
        environmentServiceName: 'My Azure Service Connection'
        # guid for the secure file to use. Can be standard terraform vars file or .env file.
        secureVarsFile: 446e8878-994d-4069-ab56-5b302067a869
        # specify a variable input via pipeline variable
        commandOptions: '-var secret=$(mySecretPipelineVar)'
```

### Secure Env Files (NEW)

If the Secure Variables file name is `*.env`, it is referred as `.env` file. This task loads environment variables from the `.env` file.

#### _.env file example_

```bash
KEY1=VALUE1
KEY2=VALUE2
```

## Terraform Output to Pipeline Variables

The TerraformCLI task supports running the Terraform `output` command. When this is run, pipeline variables will be created from each output variable emitted from the `terraform output` command. Sensitive variables will be set as secret pipeline variables and their values will not be emitted to the pipeline logs.

For example, an output variable named `some_string`  will set a pipeline variable named `TF_OUT_SOME_STRING`.

This feature currently only supports primitive types `string`, `bool`, and `number`. Complex typed outputs such as `tuple` and `object` will be excluded from the translation.

Template has output defined

```tf
output "some_string" {
  sensitive = false
  value = "somestringvalue"
}
```

Pipeline configuration to run terraform `output` command

```yaml
- task: TerraformCLI@0
    displayName: 'terraform output'
    inputs:
        command: output
```

Use output variables as pipeline variables

```yaml
- bash: |
        echo 'some_string is $(TF_OUT_SOME_STRING)'
    displayName: echo tf output vars
```

## Terraform Plan Change Detection

When running terraform plan with `-detailed-exitcode`, a pipeline variable will be set to indicate if any changes exist in the plan. `TERRAFORM_PLAN_HAS_CHANGES` will be set to `true` if plan detected changes. Otherwise, this variable will be set to `false`. This can be used in conjunction with `Custom Condition` expression under `Control Options` tab of the task to skip terraform apply if no changes were detected.

```yaml
- task: TerraformCLI@0
    displayName: 'terraform plan'
    inputs:
        command: plan
        environmentServiceName: 'My Azure Service Connection'
        commandOptions: '-out=$(System.DefaultWorkingDirectory)/terraform.tfplan -detailed-exitcode'
```

Run apply only if changes are detected.

```yaml
- task: TerraformCLI@0
    displayName: 'terraform apply'
    condition: and(succeeded(), eq(variables['TERRAFORM_PLAN_HAS_CHANGES'], 'true'))
    inputs:
        command: apply
        environmentServiceName: 'My Azure Service Connection'
        commandOptions: '$(System.DefaultWorkingDirectory)/terraform.tfplan'
```

## Terraform Plan Destroy Detection

The task now has the ability to set a pipeline variable `TERRAFORM_PLAN_HAS_DESTROY_CHANGES` if a generated plan has destroy operations. To utilize this, run terraform plan and set the `-out=my-plan-file-path` to write the generated plan to a file. Then run `terraform show` and provide the path to the generated plan file in the `Target Plan or State File Path` input field. If show, detects a destroy operation within the plan file, then the pipeline variable `TERRAFORM_PLAN_HAS_DESTROY_CHANGES` will be set to true.

```yaml
- task: TerraformCLI@0
    displayName: 'terraform plan'
    inputs:
        command: plan
        environmentServiceName: 'My Azure Service Connection'
        commandOptions: '-out=$(System.DefaultWorkingDirectory)/terraform.tfplan'
```

Run show to detect destroy operations

```yaml
- task: TerraformCLI@0
    displayName: 'terraform show'
    inputs:
        command: show
        inputTargetPlanOrStateFilePath: '$(System.DefaultWorkingDirectory)/terraform.tfplan'
```

Skip apply if destroy operations

```yaml
- task: TerraformCLI@0
    displayName: 'terraform apply'
    condition: and(succeeded(), eq(variables['TERRAFORM_PLAN_HAS_DESTROY_CHANGES'], 'false'))
    inputs:
        command: apply
        environmentServiceName: 'My Azure Service Connection'
        commandOptions: '$(System.DefaultWorkingDirectory)/terraform.tfplan'
```

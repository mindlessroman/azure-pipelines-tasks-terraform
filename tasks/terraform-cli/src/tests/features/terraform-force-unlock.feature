Feature: terraform force-unlock

    terraform force-unlock [options] [lockID]

    Scenario: force-unlock with azurerm
        Given terraform exists
        And terraform command is "force-unlock"
        And azurerm service connection "dev" exists as
            | scheme         | ServicePrincipal       |
            | subscriptionId | sub1                   |
            | tenantId       | ten1                   |
            | clientId       | servicePrincipal1      |
            | clientSecret   | servicePrincipalKey123 |
        And force-unlock is run with lock id "3ea12870-968e-b9b9-cf3b-f4c3fbe36684"
        And running command "terraform force-unlock -force 3ea12870-968e-b9b9-cf3b-f4c3fbe36684" returns successful result
        When the terraform cli task is run
        Then the terraform cli task executed command "terraform force-unlock -force 3ea12870-968e-b9b9-cf3b-f4c3fbe36684" with the following environment variables
            | ARM_SUBSCRIPTION_ID | sub1                   |
            | ARM_TENANT_ID       | ten1                   |
            | ARM_CLIENT_ID       | servicePrincipal1      |
            | ARM_CLIENT_SECRET   | servicePrincipalKey123 |
        And the terraform cli task is successful
        And pipeline variable "TERRAFORM_LAST_EXITCODE" is set to "0"
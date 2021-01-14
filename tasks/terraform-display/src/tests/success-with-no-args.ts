import mockAnswer = require('azure-pipelines-task-lib/mock-answer')
import mockRun = require('azure-pipelines-task-lib/mock-run')

import { MockTaskAgent } from 'terraform-core'
import path = require('path');

const taskPath = path.join(__dirname, '..', 'index.js');
const taskRunner: mockRun.TaskMockRunner = new mockRun.TaskMockRunner(taskPath);

const a: mockAnswer.TaskLibAnswers = {
    which: {
        terraform: "/usr/local/bin/terraform",
    },
    cwd: {
        terraform: path.resolve("./")
    },
}

/*
cat > t.tf << EOF
resource "random_pet" "this" {
  length = 2
}

output "string" {
  value = random_pet.this.id
}
EOF
terraform init
terraform plan --out=tfplan
terraform show -json tfplan
*/
const validJson: string = '{"format_version":"0.1","terraform_version":"0.14.2","planned_values":{"outputs":{"string":{"sensitive":false}},"root_module":{"resources":[{"address":"random_pet.this","mode":"managed","type":"random_pet","name":"this","provider_name":"registry.terraform.io/hashicorp/random","schema_version":0,"values":{"keepers":null,"length":2,"prefix":null,"separator":"-"}}]}},"resource_changes":[{"address":"random_pet.this","mode":"managed","type":"random_pet","name":"this","provider_name":"registry.terraform.io/hashicorp/random","change":{"actions":["create"],"before":null,"after":{"keepers":null,"length":2,"prefix":null,"separator":"-"},"after_unknown":{"id":true}}}],"output_changes":{"string":{"actions":["create"],"before":null,"after_unknown":true}},"configuration":{"root_module":{"outputs":{"string":{"expression":{"references":["random_pet.this"]}}},"resources":[{"address":"random_pet.this","mode":"managed","type":"random_pet","name":"this","provider_config_key":"random","expressions":{"length":{"constant_value":2}},"schema_version":0}]}}}'

const tfplan: string = path.resolve("./tfplan")
a.exec = {}
a.exec[`terraform show -json -no-color ${tfplan}`] =  {
    code: 0,
    stdout: validJson,
}
a.exec[`terraform show ${tfplan}`] =  {
    code: 0,
    stdout: 'just a plan/n and another line',
}

taskRunner.registerMock('./task-agent', MockTaskAgent);
taskRunner.setAnswers(a)
taskRunner.run(false);


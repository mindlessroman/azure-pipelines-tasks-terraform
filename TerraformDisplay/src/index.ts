import tasks = require("azure-pipelines-task-lib/task");
import { Container, interfaces } from 'inversify';
import "reflect-metadata";
import { TerraformInterfaces, ITaskAgent, ILogger } from "./terraform";
import { TerraformDisplayHandler } from "./terraform-display";
import TaskAgent from "./task-agent";
import { MediatorInterfaces, IMediator, Mediator } from "./mediator";
import { IHandleCommandString, CommandInterfaces, IHandleCommand } from "./command-handler";
import Logger from "./logger";

import ai = require('applicationinsights');
import { TerraformAggregateError } from "./terraform-aggregate-error";

var container = new Container();

// bind infrastructure components
container.bind<Container>("container").toConstantValue(container);
container.bind<IMediator>(MediatorInterfaces.IMediator).to(Mediator);
container.bind<ITaskAgent>(TerraformInterfaces.ITaskAgent).to(TaskAgent);
container.bind<ILogger>(TerraformInterfaces.ILogger).toDynamicValue((context: interfaces.Context) => new Logger(tasks, ai.defaultClient));

// bind the handlers for each terraform command
container.bind<IHandleCommandString>(CommandInterfaces.IHandleCommandString).to(TerraformDisplayHandler).whenTargetNamed("show");

// execute the terraform command
let mediator = container.get<IMediator>(MediatorInterfaces.IMediator);
let foo = process.env;
const lastExitCodeVariableName = "TERRAFORM_LAST_EXITCODE";
//mediator.executeRawString("version")
    //.then(() => 
    mediator.executeRawString("show")
    .then((exitCode) => {
        tasks.setVariable(lastExitCodeVariableName, exitCode.toString(), false);
        tasks.setResult(tasks.TaskResult.Succeeded, "");
    })
    .catch((error) => {
        let exitCode: number = 1;
        if(error instanceof TerraformAggregateError)
            exitCode = (<TerraformAggregateError>error).exitCode || exitCode;
        tasks.setVariable(lastExitCodeVariableName, exitCode.toString(), false);
        tasks.setResult(tasks.TaskResult.Failed, error);
    });

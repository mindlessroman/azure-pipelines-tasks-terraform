import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { inject, injectable } from 'inversify';
import { IHandleCommandString } from './command-handler';
import { ILogger, ITaskAgent, TerraformCommand, TerraformInterfaces } from './terraform';
import { TerraformRunner } from './terraform-runner';
import tasks = require('azure-pipelines-task-lib/task');

interface TerrafromDisplayAttachment {
    type: string
    sourceFile: string
    attachmentName: string
}

export class TerraformDisplay extends TerraformCommand {
    readonly inputTargetPlanFilePath: string | undefined;
    readonly secureVarsFile: string | undefined;

    readonly plainPlan: TerrafromDisplayAttachment
    readonly planSummary: TerrafromDisplayAttachment

    constructor(
        workingDirectory: string = "./",
        inputTargetPlanFilePath: string = "tfplan",
        secureVarsFile?: string) {

        super("show", tasks.resolve(workingDirectory), undefined, true);

        this.inputTargetPlanFilePath = tasks.resolve(this.workingDirectory, inputTargetPlanFilePath);
        this.secureVarsFile = secureVarsFile;

        this.plainPlan = {
            type: "plan.text",
            sourceFile: tasks.resolve(this.workingDirectory, "tfplan.txt"),
            attachmentName: "tfplan.txt"
        }

        this.planSummary = {
            type: "summary.json",
            sourceFile: tasks.resolve(this.workingDirectory, "summary.json"),
            attachmentName: "summary.json"
        }
    }
}

interface TypeSummary {
    toCreate: number
    toDelete: number
    toUpdate: number
    unchanged: number
}

interface PlanSummary {
    resources: TypeSummary
    outputs: TypeSummary
}


@injectable()
export class TerraformDisplayHandler implements IHandleCommandString {
    private readonly log: ILogger;
    private readonly taskAgent: ITaskAgent;

    constructor(
        @inject(TerraformInterfaces.ITaskAgent) taskAgent: ITaskAgent,
        @inject(TerraformInterfaces.ILogger) log: ILogger
    ) {
        this.log = log;
        this.taskAgent = taskAgent;
    }

    public async execute(command: string): Promise<number> {
        let showJson = new TerraformDisplay(
            tasks.getInput("workingDirectory"),
            tasks.getInput("inputTargetPlanFilePath"),
            tasks.getInput("secureVarsFile")
        );

        let loggedProps = {
            "secureVarsFileDefined": showJson.secureVarsFile !== undefined && showJson.secureVarsFile !== '' && showJson.secureVarsFile !== null,
        }
        return this.log.command(showJson, (command: TerraformDisplay) => this.onExecute(command), loggedProps);
    }


    private async onExecute(command: TerraformDisplay): Promise<number> {
        let jsonCommand, plainCommand: IExecSyncResult

        return Promise.all([
            new TerraformRunner(command)
                .withShowOptions(command.inputTargetPlanFilePath, false)
                .withSecureVarsFile(this.taskAgent, command.secureVarsFile)
                .withRawOutputToFile(command.plainPlan.sourceFile)
                .execWithOutput(),

            new TerraformRunner(command)
                .withShowOptions(command.inputTargetPlanFilePath, true)
                .withSecureVarsFile(this.taskAgent, command.secureVarsFile)
                .execWithOutput(),

        ]).then((res) => {

            [plainCommand, jsonCommand] = res

            const ps = this.getPlanSummary(jsonCommand.stdout)

            this.produceWarnings(ps)

            tasks.writeFile(command.planSummary.sourceFile, JSON.stringify(ps))

            tasks.addAttachment(command.planSummary.type, command.planSummary.attachmentName, command.planSummary.sourceFile)
            tasks.addAttachment(command.plainPlan.type, command.plainPlan.attachmentName, command.plainPlan.sourceFile)

            return jsonCommand.code
        }).catch((err) => {
            tasks.error("Failed to run `terraform show`: " + err)
            return -1
        })
    }

    private updateSummary(action: string, summary: TypeSummary): TypeSummary {
        switch (action) {
            case "no-op":
                summary.unchanged++
                break
            case "delete":
                summary.toDelete++
                break
            case "create":
                summary.toCreate++
                break
            case "update":
                summary.toUpdate++
                break
        }
        return summary
    }

    private getChanges(items: Array<any>, fetchActions: (obj: any) => Array<string>) {
        let summary: TypeSummary = {
            toCreate: 0,
            toDelete: 0,
            toUpdate: 0,
            unchanged: 0,
        }
        let errors: Boolean = false

        for (let item of items) {
            const actions = fetchActions(item)
            if (actions.length > 0) {
                for (let action of actions) {
                    summary = this.updateSummary(action, summary)
                }
            } else {
                tasks.debug("Got empty actions array. It is possible that plan json schema is different.")
                errors = true
            }
        }

        return summary

    }

    private produceWarnings(s: PlanSummary): void {
        if (s.outputs.toDelete + s.resources.toDelete > 0) {
            tasks.warning(`This plan is going to destroy ${s.resources.toDelete} resources and ${s.outputs.toDelete} ouputs.`)
        }
        if (s.outputs.toUpdate + s.resources.toUpdate > 0) {
            tasks.warning(`This plan is going to update ${s.resources.toUpdate} resources and ${s.outputs.toUpdate} outputs.`)
        }
        if (s.outputs.toCreate + s.resources.toCreate > 0) {
            tasks.warning(`This plan is going to create ${s.resources.toCreate} resources and ${s.outputs.toCreate} outputs.`)
        }
    }

    private getPlanSummary(planJson: string): PlanSummary {
        const jsonResult = JSON.parse(planJson.replace(/(\r\n|\r|\n)/gm, ""));
        const resources: Array<any> = jsonResult.resource_changes as Array<any>
        const outputs: Array<any> = Object.keys(jsonResult.output_changes).map((key) => { return jsonResult.output_changes[key] })


        const summary: PlanSummary = {
            resources: this.getChanges(resources, (resource: any) => { return resource.change.actions || [] }),
            outputs: this.getChanges(outputs, (resource: any) => { return resource.actions || [] }),
        }

        tasks.debug("Calculated the following summary: " + JSON.stringify(summary))
        return summary
    }
}


import AnsiUp from 'ansi_up';
import tasks = require('azure-pipelines-task-lib/task');
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { inject, injectable } from 'inversify';
import { IHandleCommandString } from 'TerraformCLI/command-handler';
import { ILogger, ITaskAgent, TerraformCommand, TerraformInterfaces } from 'TerraformCLI/terraform';
import { TerraformRunner } from 'TerraformCLI/terraform-runner';


export class TerraformDisplay extends TerraformCommand{
   readonly inputTargetPlanFilePath: string |undefined;
   readonly secureVarsFile: string | undefined;

    constructor(
        name: string,
        workingDirectory: string,
        inputTargetPlanFilePath: string,
        secureVarsFile?: string){
        super(name, workingDirectory, undefined, true);

        this.inputTargetPlanFilePath = inputTargetPlanFilePath;
        this.secureVarsFile = secureVarsFile;
    }
}

interface PlanSummary {
    toCreate: number
    toDelete: number
    toUpdate: number
    unchanged: number
}

@injectable()
export class TerraformDisplayHandler implements IHandleCommandString{
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
            "show",
            tasks.getInput("workingDirectory") || "./",
            tasks.getInput("inputTargetPlanFilePath") || "tfplan",
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
                .withRawOutputToFile("/Users/agoncharov/src/shura/azure-pipelines-tasks-terraform/TerraformDisplay/tfplan.txt")
                .execWithOutput(),       

            new TerraformRunner(command)
                .withShowOptions(command.inputTargetPlanFilePath, true)
                .withSecureVarsFile(this.taskAgent, command.secureVarsFile)
                .execWithOutput(),

        ]).then((res) => {
            [plainCommand, jsonCommand] = res
            tasks.addAttachment("plan.text", "tfplan.html", "tfplan.txt")
            tasks.writeFile("plan-summary.json", this.getPlanSummary(jsonCommand.stdout))
            tasks.addAttachment("plan.summary", "plan-summary.json", "plan-summary.json")
            return jsonCommand.code
        }).catch((err) => {
            tasks.error("Failed to run `terraform show`: " + err)
            return -1
        })        
    }

    private planTextToHtml(text: string): string {
        const ansi_up = new AnsiUp();
        return "<pre>\n" + ansi_up.ansi_to_html(text) + "\n</pre>\n"
    }

    private updateSummary(action: string, summary: PlanSummary): PlanSummary {
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
        let summary: PlanSummary = {
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
                tasks.warning("Got empty actions array. It is possible that plan json schema is different.")
                errors = true
            }
        }

        return summary
      
    }
    
    private getPlanSummary(planJson: string): string {
        const jsonResult = JSON.parse(planJson.replace(/(\r\n|\r|\n)/gm, ""));
        const r:Array<any> = jsonResult.resource_changes as Array<any>
        const o:Array<any> = Object.values(jsonResult.output_changes)

        const summary = {
            resources: this.getChanges(r, (resource: any) => { return resource.change.actions || []}),
            outputs:   this.getChanges(r, (resource: any) => { return resource.actions        || []}),
        }

        tasks.debug("Calculated the following summary: " + JSON.stringify(summary))
        return JSON.stringify(summary)
    }

}
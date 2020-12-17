import tasks = require('azure-pipelines-task-lib/task');
import { IExecOptions, ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import * as dotenv from "dotenv";
import { createWriteStream } from 'fs';
import TaskAgent from './task-agent';


interface TerrafromDisplayAttachment {
    type: string
    sourceFile: string
    attachmentName: string
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

export class TerraformDisplay {

    protected readonly tool: ToolRunner
    protected readonly planFilePath: string;
    protected secureVarsFile: string | undefined;
    protected readonly workingDirectory: string
    protected stdout: Buffer[] = [];
    protected stderr: Buffer[] = [];
    protected taskAgent: TaskAgent
    protected execOptions: IExecOptions
    protected args: string[] = []

    constructor(
        workingDirectory: string = "./",
        planFilePath: string = "tfplan",
        silent: boolean = false,
        secureVarsFile?: string,
    ) {

        this.workingDirectory = tasks.resolve(workingDirectory)
        this.planFilePath = tasks.resolve(this.workingDirectory, planFilePath);

        this.tool = new ToolRunner('terraform').arg('show')
        
        this.tool.on("stdout", (data: Buffer) => {
            this.stdout.push(data);
        });
        this.tool.on("stderr", (data: Buffer) => {
            this.stderr.push(data);
        });

        this.execOptions = {
            failOnStdErr: false,
            ignoreReturnCode: false,
            cwd: this.workingDirectory,
            silent: true,
        }

        this.taskAgent = new TaskAgent()

        if (secureVarsFile) {
            this.taskAgent.downloadSecureFile(secureVarsFile)
                .then((res) => {
                    this.secureVarsFile = res
                })
                .catch((err) => {
                    throw new Error(`Failed to download secure vars file ${err}`)
                })
        }
    }

    public async execute(): Promise<number> {
        return this.run()
    }

    protected arg(arg: string): TerraformDisplay{
        this.tool.arg(arg)
        this.args.push(arg)
        return this
    }

    protected run(): Promise<number> {
        
        this.arg(this.planFilePath)

        if (this.secureVarsFile) {
            const config = dotenv.config({ path: this.secureVarsFile }).parsed;
            if ((!config) || (Object.keys(config).length === 0 && config.constructor === Object)) {
                throw "The .env file doesn't have valid entries.";
            }
        }

        tasks.debug(`Running terraform ${this.args.join(" ")}`)
        return new Promise<number>((resolve, reject) => {
            this.tool.exec(this.execOptions)
            .then((code) => {
                if (code > 0) {
                    tasks.error(`Failed to run terraform show ${this.args.join(" ")}: ${this.buffersToString(this.stderr)}`)
                    reject(code)
                }
                tasks.debug(`Completed terraform show ${this.args.join(" ")}`)
                resolve(code)
            })
            .catch((err) => {
                const e = (`Failed to run terraform show ${this.args.join(" ")} : ${err}`)
                tasks.error(e)
                throw new Error(e)
            })
        })
    }

    protected buffersToString(buffers: Buffer[]): string {
        return buffers
            .map(data => {
                return data.toString()
            })
            .join('')
    }

    protected decodeBuffers(buffers: Buffer[]): string {

        const td = new TextDecoder
        return buffers
            .map(data => {
                return td.decode(data)
            })
            .join('')
    }

}

export class TerraformDisplayPlainPlan extends TerraformDisplay {

    private attachment: TerrafromDisplayAttachment

    constructor(
        workingDirectory: string = "./",
        planFilePath: string = "tfplan",
        secureVarsFile?: string
    ) {
        super(
            workingDirectory,
            planFilePath,
            false,
            secureVarsFile
        )

        this.attachment = {
            type: "plan.text",
            sourceFile: tasks.resolve(this.workingDirectory, "tfplan.txt"),
            attachmentName: "tfplan.txt"
        }

        this.execOptions.silent = false

        this.execOptions.outStream = createWriteStream(this.attachment.sourceFile)
    }

    public async execute(): Promise<number> {

        this.tool.pipeExecOutputToTool(
            tasks.tool("tee").arg(this.attachment.sourceFile),
        )

        return this.run()
            .then((code) => {
                tasks.addAttachment(this.attachment.type, this.attachment.attachmentName, this.attachment.sourceFile)
                return code
            })
            .catch((err) => {
                throw new Error(err)
            })
    }
}

export class TerraformDisplayJsonPlan extends TerraformDisplay {
    private readonly produceWarningsAtSummary: boolean = true

    private attachment: TerrafromDisplayAttachment

    constructor(
        workingDirectory: string = "./",
        planFilePath: string = "tfplan",
        secureVarsFile?: string
    ) {
        super(
            workingDirectory,
            planFilePath,
            false,
            secureVarsFile
        )

        this.arg("-json")
        this.arg("-no-color")

        this.attachment = {
            type: "summary.json",
            sourceFile: tasks.resolve(this.workingDirectory, "summary.json"),
            attachmentName: "summary.json"
        }
    }

    public async execute(): Promise<number> {

        return this.run()
            .then((code) => {
                const summary = this.getPlanSummary(this.buffersToString(this.stdout))
                if (this.produceWarningsAtSummary) { this.produceWarnings(summary) }
    
                tasks.writeFile(this.attachment.sourceFile, JSON.stringify(summary))
                tasks.addAttachment(this.attachment.type, this.attachment.attachmentName, this.attachment.sourceFile)
    
                return code
            })
            .catch((err) => {
                throw new Error(err)
            })
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
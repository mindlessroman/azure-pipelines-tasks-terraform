import tasks = require('azure-pipelines-task-lib/task');
import { IExecOptions, ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import * as dotenv from "dotenv";
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
    resources: TypeSummary | undefined
    outputs: TypeSummary | undefined
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
    protected uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    constructor(
        workingDirectory: string = "./",
        planFilePath: string = "tfplan",
        silent: boolean = false,
        secureVarsFile?: string,
    ) {

        this.workingDirectory = tasks.resolve(workingDirectory)
        this.planFilePath = tasks.resolve(this.workingDirectory, planFilePath);

        this.tool = tasks.tool('terraform').arg('show')

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

        this.secureVarsFile = secureVarsFile
        this.taskAgent = new TaskAgent()
    }

    private async getSecureVarsFile(idOrName: string): Promise<string> {

        tasks.debug(` Secure file is configured to ${this.secureVarsFile}`)
        let fname: string
        // if we get filename here instead of UUID
        // then we are not running in agent, and will
        // try to regard this as the filename.
        if (!this.uuidPattern.test(idOrName)) {
            tasks.debug(`Secure vars file is not UUID (${idOrName}), assuming relative path.`)
            fname = tasks.resolve(this.workingDirectory, idOrName)
        } else {
            fname = await this.taskAgent.downloadSecureFile(idOrName)
        }
        return fname
    }

    private async loadEnv(): Promise<void> {
        if (this.secureVarsFile) {
            return this.getSecureVarsFile(this.secureVarsFile)
                .then((path) => {
                    tasks.debug(` Loading enviroment from ${path}`)
                    const config = dotenv.config({
                        path: path,
                        debug: false,
                    })
                        .parsed

                    if ((!config) || (Object.keys(config).length === 0 && config.constructor === Object)) {
                        throw "The .env file doesn't have valid entries.";
                    }
                })
        }
    }

    public async execute(): Promise<number> {
        return this.run()
    }

    protected arg(arg: string): TerraformDisplay {
        this.tool.arg(arg)
        this.args.push(arg)
        return this
    }

    protected async run(): Promise<number> {

        this.arg(this.planFilePath)

        tasks.debug(`Running terraform show ${this.args.join(" ")}`)
        return this.loadEnv()
            .then(() => {
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
    }

    public async execute(): Promise<number> {

        return this.run()
            .then((code) => {
                if (this.stdout[0] && typeof this.stdout[0] === "string") {
                    tasks.debug("Running tests, the are stupid.")
                } else {
                    tasks.writeFile(this.attachment.sourceFile, Buffer.concat(this.stdout))
                }
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

                if (this.produceWarningsAtSummary && summary) { this.produceWarnings(summary) }

                tasks.writeFile(this.attachment.sourceFile, JSON.stringify(summary))
                tasks.addAttachment(this.attachment.type, this.attachment.attachmentName, this.attachment.sourceFile)

                return code
            })
            .catch((err) => {
                throw new Error(err)
            })
    }

    private getStr(i: number, w: string): string {
        let m = "unknown amount of"
        let s = "s"
        if (i >= 0) {
            m = `${i}`
            if (i == 1) { s = '' }
        }

        return `${m} ${w}${s}`
    }

    private planWarningLine(t: string, resources: number, outputs: number) {
        const l: string = `This plan is going to ${t} ${this.getStr(resources, 'resource')} and ${this.getStr(outputs, 'output')}.`
        if (resources != 0 || outputs != 0) {
            tasks.warning(l)
        }
    }

    private produceWarnings(s: PlanSummary): void {
        this.planWarningLine("destroy", s.resources ? s.resources.toDelete : -1, s.outputs ? s.outputs.toDelete : -1)
        this.planWarningLine("update", s.resources ? s.resources.toUpdate : -1, s.outputs ? s.outputs.toUpdate : -1)
        this.planWarningLine("create", s.resources ? s.resources.toCreate : -1, s.outputs ? s.outputs.toCreate : -1)
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

    private getPlanSummary(planJson: string): PlanSummary | undefined {
        const summary: PlanSummary = {
            resources: undefined,
            outputs: undefined
        }

        const jsonResult = JSON.parse(planJson.replace(/(\r\n|\r|\n)/gm, ""));
        if (!jsonResult) {
            tasks.error("Failed to parse JSON plan output.")
            tasks.setResult(tasks.TaskResult.SucceededWithIssues, "Failed to parse json plan.", false)
            return undefined
        }

        if (!jsonResult.format_version) {
            tasks.warning("Terraform show json output does not have format_version key. Task code update might be required.")
        } else {
            tasks.debug(`Getting values from plan json version: ${jsonResult.format_version}.`)
        }

        const resources: Array<any> = jsonResult.resource_changes as Array<any>
        if (!resources) {
            tasks.debug("There is no 'resources' key in plan json, means no changes.")
            summary.resources = { toCreate: 0, toUpdate: 0, toDelete: 0, unchanged: -1 } // -1 to report unknow, because there is no way to calculate that.
        } else {
            summary.resources = this.getChanges(resources, (resource: any) => { return resource.change.actions || [] })
        }

        if (!jsonResult.output_changes) {
            tasks.error("No 'resource_changes' key in the json plan or it is not an array.")
            tasks.setResult(tasks.TaskResult.SucceededWithIssues, "Failed to parse json plan.", false)
        } else {
            const outputs: Array<any> = Object.keys(jsonResult.output_changes).map((key) => { return jsonResult.output_changes[key] })
            summary.outputs = this.getChanges(outputs, (resource: any) => { return resource.actions || [] })
        }

        tasks.debug("Calculated the following summary: " + JSON.stringify(summary))

        return summary
    }
}

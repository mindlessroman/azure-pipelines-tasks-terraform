import tasks = require("azure-pipelines-task-lib/task");
import { ToolRunner, IExecSyncOptions, IExecSyncResult, IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import { TerraformCommand, ITaskAgent } from "./terraform";
import { TerraformAggregateError } from "./terraform-aggregate-error";
import * as dotenv from "dotenv"
import * as path from "path"
import os from 'os';

export interface TerraformCommandContext {
    terraform: ToolRunner;
    command: TerraformCommand;
}

export abstract class TerraformCommandBuilder {
    abstract run(context: TerraformCommandContext): Promise<void>;
}

export abstract class TerraformCommandDecorator extends TerraformCommandBuilder{
    protected readonly builder: TerraformCommandBuilder;
    constructor(builder: TerraformCommandBuilder) {
        super();
        this.builder = builder;
    }
    async run(context: TerraformCommandContext): Promise<void>{
        await this.builder.run(context);
        await this.onRun(context);
    }
    abstract onRun(context: TerraformCommandContext): Promise<void>;
}

export class TerraformWithCommand extends TerraformCommandBuilder{
    private readonly command: TerraformCommand;

    constructor(command: TerraformCommand) {
        super();
        this.command = command;
    }
    async run(context: TerraformCommandContext): Promise<void> {
        if (this.command) {
            if (this.command.name == "forceunlock") {
                context.terraform.arg("force-unlock");
            } else {
                context.terraform.arg(this.command.name);
            }
        }
    }
}

export class TerraformWithProvider extends TerraformCommandDecorator{
    private readonly environmentServiceName: string | undefined;
    constructor(builder: TerraformCommandBuilder, environmentServiceName: string | undefined) {
        super(builder);
        this.environmentServiceName = environmentServiceName;
    }
    async onRun(context: TerraformCommandContext): Promise<void> {
        if(this.environmentServiceName){
            let scheme = tasks.getEndpointAuthorizationScheme(this.environmentServiceName, true);
            if(scheme != "ServicePrincipal"){
                throw "Terraform only supports service principal authorization for azure";
            }

            process.env['ARM_SUBSCRIPTION_ID']  = tasks.getEndpointDataParameter(this.environmentServiceName, "subscriptionid", false);
            process.env['ARM_TENANT_ID']        = tasks.getEndpointAuthorizationParameter(this.environmentServiceName, "tenantid", false);
            process.env['ARM_CLIENT_ID']        = tasks.getEndpointAuthorizationParameter(this.environmentServiceName, "serviceprincipalid", false);
            process.env['ARM_CLIENT_SECRET']    = tasks.getEndpointAuthorizationParameter(this.environmentServiceName, "serviceprincipalkey", false);
        }
    }
}

export class TerraformWithAutoApprove extends TerraformCommandDecorator{
    constructor(builder: TerraformCommandBuilder) {
        super(builder);
    }
    async onRun(context: TerraformCommandContext): Promise<void> {
        if(context.command.name !== 'apply' && context.command.name !== 'destroy')
            throw "'-auto-approve option only valid for commands apply and destroy";
        const autoApproveOption = "-auto-approve";
        if(!context.command.options || (context.command.options && context.command.options.includes(autoApproveOption) === false)){
            context.terraform.arg(autoApproveOption);
        }
    }
}

export class TerraformWithOptions extends TerraformCommandDecorator{
    constructor(builder: TerraformCommandBuilder) {
        super(builder);
    }
    async onRun(context: TerraformCommandContext): Promise<void> {
        if(context.command.options){
            context.terraform.line(context.command.options);
        }
    }
}

export class TerraformWithJsonOutput extends TerraformCommandDecorator{
    constructor(builder: TerraformCommandBuilder) {
        super(builder);
    }
    async onRun(context: TerraformCommandContext): Promise<void> {
        if(!context.command.options || (context.command.options && !context.command.options.includes("-json"))){
            context.terraform.arg("-json");
        }
    }
}

export class TerraformWithSecureVarFile extends TerraformCommandDecorator{
    private readonly taskAgent: ITaskAgent;
    private readonly secureVarFileId: string | undefined;
    constructor(builder: TerraformCommandBuilder, taskAgent: ITaskAgent, secureVarFileId?: string | undefined) {
        super(builder);
        this.taskAgent = taskAgent;
        this.secureVarFileId = secureVarFileId;
    }
    async onRun(context: TerraformCommandContext): Promise<void> {
        if(this.secureVarFileId){
            var secureFilePath = await this.taskAgent.downloadSecureFile(this.secureVarFileId);
            const fileName = tasks.getSecureFileName(this.secureVarFileId);
            if(fileName && this.isEnvFile(fileName)) {
                let config = dotenv.config({ path: secureFilePath }).parsed;
                if ((!config) || (Object.keys(config).length === 0 && config.constructor === Object)) {
                    throw "The .env file doesn't have valid entries.";
                }
            } else {
                if(context.command.name === 'init' || context.command.name === 'show') {
                    throw "terraform "+context.command.name+" command supports only env files, no tfvars are allowed during this stage.";
                }
                secureFilePath = secureFilePath.replace(/ /g, '\\ ');
                context.terraform.arg(`-var-file=${secureFilePath}`);
            }

        }
    }
    isEnvFile(fileName: string) {
        if (fileName === undefined || fileName === null) return false;
        if (fileName === '.env') return true;
        return ('.env' === path.extname(fileName))
    }

}

export class TerraformWithShow extends TerraformCommandDecorator{
    private readonly inputFile: string | undefined;
    private readonly json: Boolean = true
    constructor(builder: TerraformCommandBuilder, inputFile?: string |undefined, json: Boolean = true) {
        super(builder);
        this.inputFile =  inputFile;
        this.json = json
    }
    async onRun(context: TerraformCommandContext): Promise<void>{
        if (this.json) { context.terraform.arg('-json'); }
        if(this.inputFile){
            context.terraform.arg(this.inputFile.toString())
        }
    }
}

export class TerraformWithLockID extends TerraformCommandDecorator{
    private readonly lockID: string | undefined;
    constructor(builder: TerraformCommandBuilder, lockID?: string |undefined) {
        super(builder);
        this.lockID =  lockID;
    }
    async onRun(context: TerraformCommandContext): Promise<void>{
        context.terraform.arg('-force');
        if(this.lockID){
            context.terraform.arg(this.lockID.toString())
        }
    }
}

export class TerraformRawOuputToFile extends TerraformCommandDecorator {
    private readonly outputFile: string;

    constructor(builder: TerraformCommandBuilder, outputFile: string) {
        super(builder);
        this.outputFile = outputFile;
    }
    async onRun(context: TerraformCommandContext): Promise<void>{
        context.terraform.pipeExecOutputToTool(
            tasks.tool(tasks.which("tee", true)).arg(this.outputFile),
        )
    }
}

export class TerraformRunner{
    private readonly terraform: ToolRunner;
    private readonly terraformPath: string;
    public readonly command: TerraformCommand;
    private builder: TerraformCommandBuilder;
    private stdOutBuffers: Buffer[] = [];
    private stdErrBuffers: Buffer[] = [];
    private optionsAdded: boolean = false;

    constructor(command: TerraformCommand) {
        this.command = command;
        this.builder = new TerraformWithCommand(command);

        this.terraformPath = tasks.which("terraform", true);
        this.terraform = tasks.tool(this.terraformPath);

        this.terraform.on("stdout", (data: Buffer) => {
            this.stdOutBuffers.push(data);
        });
        this.terraform.on("stderr", (data: Buffer) => {
            this.stdErrBuffers.push(data);
        });
    }

    with(decoratorFactory: (builder: TerraformCommandBuilder) => TerraformCommandBuilder): TerraformRunner{
        this.builder = decoratorFactory(this.builder);
        return this;
    }

    withProvider(environmentServiceName: string | undefined): TerraformRunner{
        this.builder = new TerraformWithProvider(this.builder, environmentServiceName);
        return this;
    }

    withAutoApprove(): TerraformRunner{
        this.builder = new TerraformWithAutoApprove(this.builder);
        return this;
    }

    withSecureVarsFile(taskAgent: ITaskAgent, secureVarFileId?: string | undefined): TerraformRunner{
        return this.with((builder) => new TerraformWithSecureVarFile(builder, taskAgent, secureVarFileId));
    }

    withShowOptions(inputFile?: string | undefined, json: Boolean = true): TerraformRunner{
        return this.with((builder) => new TerraformWithShow(builder, inputFile, json));
    }

    withLockID(lockID?: string | undefined): TerraformRunner{
        return this.with((builder) => new TerraformWithLockID(builder, lockID));
    }

    withOptions(): TerraformRunner{
        this.optionsAdded = true;
        return this.with((builder) => new TerraformWithOptions(builder));
    }

    withJsonOutput(): TerraformRunner{
        return this.with((builder) => new TerraformWithJsonOutput(builder));
    }

    withRawOutputToFile(outputFile: string): TerraformRunner{
        return this.with((builder) => new TerraformRawOuputToFile(builder, outputFile));
    }

    private _processBuffers(buffers: Buffer[]): string {
        return buffers
            .map(data => {
                return data.toString();
            })
            .join(os.EOL)
            .toString();
    }

    async exec(successfulExitCodes?: number[] | undefined): Promise<number>{

        let result = await this.execWithOutput(successfulExitCodes);
        return result.code;
    }
    async execWithOutput(successfulExitCodes?: number[] | undefined): Promise<IExecSyncResult>{

        await this.builder.run(<TerraformCommandContext>{
            terraform: this.terraform,
            command: this.command
        });

        if(!successfulExitCodes || successfulExitCodes.length == 0){
            successfulExitCodes = [0];
        }

        // append the user provided options last if the command handler didn't already explicitly append
        if (this.command.options && !this.optionsAdded) {
            this.terraform.line(this.command.options);
        }

        const code = await this.terraform.exec(<IExecOptions>{
            cwd: this.command.workingDirectory,
            ignoreReturnCode: true,
            silent: this.command.isSilent
        });

        const stdout = this._processBuffers(this.stdOutBuffers);
        const stderr = this._processBuffers(this.stdErrBuffers);

        if(!successfulExitCodes.includes(code)){
            throw new TerraformAggregateError(this.command.name, stderr, code);
        }

        return <IExecSyncResult>{
            code,
            stdout,
            stderr
        };
    }
}

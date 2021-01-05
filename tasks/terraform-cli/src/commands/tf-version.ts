import { ICommand, CommandResponse } from ".";
import { IRunner, RunnerOptions } from "../runners";
import { ITaskContext } from "../context";

export class TerraformVersion implements ICommand {    
    private readonly runner: IRunner;

    constructor(runner: IRunner){
        this.runner = runner;
    }

    async exec(ctx: ITaskContext): Promise<CommandResponse> {
        const options = new RunnerOptions("terraform", "version", ctx.cwd);
        const result = await this.runner.exec(options);
        return result.toCommandResponse();
    }
}
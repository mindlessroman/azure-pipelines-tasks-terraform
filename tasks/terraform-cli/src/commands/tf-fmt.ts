import { CommandResponse, ICommand } from ".";
import { ITaskContext } from "../context";
import { IRunner } from "../runners";
import { RunWithTerraform } from "../runners/builders";

export class TerraformFormat implements ICommand {
    constructor(
        private readonly runner: IRunner
        ) {
    }

    async exec(ctx: ITaskContext): Promise<CommandResponse> {
        const options = await new RunWithTerraform(ctx)
            .withOptions(ctx.commandOptions, [
                "--check",
                "--diff",
                "--recursive"
            ])
            .withCommandOptions(ctx.commandOptions)
            .build();
        const result = await this.runner.exec(options);

        return result.toCommandResponse();
    }
}
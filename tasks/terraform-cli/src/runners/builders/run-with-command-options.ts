import { RunnerOptionsBuilder, RunnerOptionsDecorator } from ".";
import { RunnerOptions } from "..";

export default class RunWithCommandOptions extends RunnerOptionsDecorator{
    constructor(builder: RunnerOptionsBuilder, private readonly commandOptions: string | undefined) {
        super(builder);
    }
    async build(): Promise<RunnerOptions> {   
        const options = await this.builder.build();
        if(this.commandOptions){
            options.args.push(this.commandOptions);
        }
        return options;
    }
}

declare module "." {
    interface RunnerOptionsBuilder {
        withCommandOptions(this: RunnerOptionsBuilder, commandOptions: string | undefined): RunnerOptionsBuilder;
    }
}

RunnerOptionsBuilder.prototype.withCommandOptions = function(this: RunnerOptionsBuilder, commandOptions: string | undefined): RunnerOptionsBuilder {
    return new RunWithCommandOptions(this, commandOptions);
}
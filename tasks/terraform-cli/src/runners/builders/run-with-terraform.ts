import { RunnerOptionsBuilder } from ".";
import { RunnerOptions } from "..";
import { ITaskContext } from "../../context";

export default class RunWithTerraform extends RunnerOptionsBuilder {
    constructor(
        private readonly ctx: ITaskContext,
        private readonly silent?: boolean
    ) {
        super();
    }
    build(): Promise<RunnerOptions> {
        let commandName = this.ctx.name;
        if (this.ctx.name == "forceunlock") {
            commandName = "force-unlock";
        }
        return Promise.resolve(
            new RunnerOptions("terraform", commandName, this.ctx.cwd, this.silent)
        )
    }
}

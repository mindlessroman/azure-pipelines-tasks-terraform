import { RunnerOptionsBuilder } from ".";
import { RunnerOptions } from "..";
import { ITaskContext } from "../../context";

export default class RunWithTerraform extends RunnerOptionsBuilder {
    constructor(
        private readonly ctx: ITaskContext,
        private readonly silent?: boolean,
        private readonly command?: string
    ) {
        super();
    }
    build(): Promise<RunnerOptions> {
        const command = this.command || this.ctx.name;
        return Promise.resolve(
            new RunnerOptions("terraform", command, this.ctx.cwd, this.silent)
        )
    }
}

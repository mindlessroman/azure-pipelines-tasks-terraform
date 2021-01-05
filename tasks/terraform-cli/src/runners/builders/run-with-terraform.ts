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
        return Promise.resolve(
            new RunnerOptions("terraform", this.ctx.name, this.ctx.cwd, this.silent)
        )
    }
}

import { ILogger } from ".";
import { ITaskLib } from "..";
import { ITaskContext } from "../context";

export default class TaskLogger implements ILogger {    
    constructor(
        private readonly ctx: ITaskContext, 
        private readonly tasks: ITaskLib){
    }

    command(success: boolean, duration: number): void {
        const args = {
            name: this.ctx.name,
            success: success,
            resultCode: success ? 200 : 500,
            duration: duration
        };
        this.tasks.debug(`executed command '${this.ctx.name}' ${args}`)
    }

    error(message: string): void {
        this.tasks.error(message);
    }

    warning(message: string): void {
        this.tasks.warning(message);
    }

    debug(message: string): void {
        this.tasks.debug(message);
    }
}
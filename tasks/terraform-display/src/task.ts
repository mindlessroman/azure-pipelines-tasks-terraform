import * as tasks from "azure-pipelines-task-lib/task";
import { ILogger, ITask, ITaskAgent, ITaskResponse } from "terraform-core";
import { TaskResult } from 'azure-pipelines-task-lib'
import { TerraformDisplayJsonPlan, TerraformDisplayPlainPlan } from "./terraform-display";
import { ITerraformDisplayContext } from "./context";

export default class TerraformDisplayTask implements ITask{
    private readonly plain: TerraformDisplayPlainPlan;
    private readonly json: TerraformDisplayJsonPlan;
    constructor(
        ctx: ITerraformDisplayContext,
        taskAgent: ITaskAgent,
        private readonly logger: ILogger) {
            this.plain = new TerraformDisplayPlainPlan(taskAgent, ctx, tasks)
            this.json = new TerraformDisplayJsonPlan(taskAgent, ctx, tasks);
    }

    async exec(): Promise<ITaskResponse> {
        try{
            await Promise.all([this.json.execute(),this.plain.execute()])
            return <ITaskResponse>{
                result: TaskResult.Succeeded,
                message: ""
            }
        }
        catch(err){
            this.logger.error(`TerraformDisplay failed ${err}`)
            return <ITaskResponse>{
                result: TaskResult.Failed,
                message: err
            }
        }
    }

}
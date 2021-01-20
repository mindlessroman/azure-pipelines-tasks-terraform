import tasks = require("azure-pipelines-task-lib/task");
import { AzdoTaskAgent, ITaskResponse, TaskLogger } from "terraform-core";
import { TerraformDisplayContext } from "./context";
import TerraformDisplayTask from "./task";

const ctx = new TerraformDisplayContext(tasks);
const taskAgent = new AzdoTaskAgent(tasks);
const logger = new TaskLogger(ctx, tasks);
const task = new TerraformDisplayTask(ctx, taskAgent, logger);

task.exec()
.then((res: ITaskResponse) => {
    tasks.setResult(res.result, res.message, true);
}).catch((err) => {
    tasks.error(`TerraformDisplay failed ${err}`)
    tasks.setResult(tasks.TaskResult.Failed, err, true)
});

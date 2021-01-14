import tasks = require("azure-pipelines-task-lib/task");
import { AzdoTaskAgent } from "terraform-core";
import { TerraformDisplayContext } from "./context";
import { TerraformDisplay, TerraformDisplayJsonPlan, TerraformDisplayPlainPlan } from "./terraform-display";

const ctx = new TerraformDisplayContext(tasks);
const taskAgent = new AzdoTaskAgent(tasks);
const plain: TerraformDisplay = new TerraformDisplayPlainPlan(taskAgent, ctx, tasks)
const json: TerraformDisplay = new TerraformDisplayJsonPlan(taskAgent, ctx, tasks)

Promise.all([
    json.execute(),
    plain.execute(),
]).then((res) => {
    tasks.setResult(tasks.TaskResult.Succeeded, "", true)
}).catch((err) => {
    tasks.error(`TerraformDisplay failed ${err}`)
    tasks.setResult(tasks.TaskResult.Failed, err, true)
})

import tasks = require("azure-pipelines-task-lib/task");
import TaskAgent from "./task-agent";
import { TerraformDisplay, TerraformDisplayJsonPlan, TerraformDisplayPlainPlan } from "./terraform-display";

const workingDirectory: string = tasks.getInput("workingDirectory") || "./"
const secureVarsFile: string | undefined = tasks.getInput("secureVarsFile")
const planFilePath: string = tasks.getInput("planFilePath") || "tfplan"
const taskAgent = new TaskAgent();

const plain: TerraformDisplay = new TerraformDisplayPlainPlan(taskAgent, workingDirectory, planFilePath, secureVarsFile)
const json: TerraformDisplay = new TerraformDisplayJsonPlan(taskAgent, workingDirectory, planFilePath, secureVarsFile)

Promise.all([
    json.execute(),
    plain.execute(),
]).then((res) => {
    tasks.setResult(tasks.TaskResult.Succeeded, "", true)
}).catch((err) => {
    tasks.error(`TerraformDisplay failed ${err}`)
    tasks.setResult(tasks.TaskResult.Failed, err, true)
})

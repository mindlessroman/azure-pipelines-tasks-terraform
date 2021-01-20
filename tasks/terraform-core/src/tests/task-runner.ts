import * as ma from "azure-pipelines-task-lib/mock-answer";
import { setAnswers } from "../runners/mock-tool-factory";
import intercept from 'intercept-stdout';
import { ITask, ITaskResponse } from "..";

export default class TaskRunner {
    error?: Error;
    response?: ITaskResponse;
    logs: string[] = [];

    constructor(private readonly task: ITask) {        
    }

    public async run(taskAnswers: ma.TaskLibAnswers) {
        // const toolFactory = new MockToolFactory(tasks);
        // const taskAgent = new MockTaskAgent()
        // const logger = new TaskLogger(taskContext, <ITaskLoggerLib><any>tasks)
        // const runner = new AzdoRunner(toolFactory, logger);
        // const task = new Task(taskContext, runner, taskAgent, logger);
        setAnswers(taskAnswers);
        try{
            //separate the stdout from task and cucumbers test
            const unhook_intercept = intercept((text: string) => {
                this.logs.push(text);
                return '';
            })
            this.response = await this.task.exec();
            unhook_intercept();
        }
        catch(error){
            this.error = error;
        }
    }
}
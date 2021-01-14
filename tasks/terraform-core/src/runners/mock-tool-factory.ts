import { ITaskLib } from '..';
import { IToolFactory, IToolRunner } from './index';

export default class MockToolFactory implements IToolFactory {
    constructor(private readonly tasks: ITaskLib) {
    }
    create(tool: string): IToolRunner {        
        const terraformPath = this.tasks.which(tool, true);
        return <IToolRunner>this.tasks.tool(terraformPath);
    }
}

export { setAnswers } from 'azure-pipelines-task-lib/mock-task';
import { ITaskLib } from "..";
import { IToolFactory, IToolRunner } from './index';

export default class AzdoToolFactory implements IToolFactory {
    constructor(private readonly tasks: ITaskLib) {
    }
    create(tool: string): IToolRunner {
        const terraformPath = this.tasks.which(tool, true);
        return this.tasks.tool(terraformPath);
    }
}

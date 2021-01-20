import { AzdoTaskContext, ITaskContext, MockTaskContext, ITaskLib } from "terraform-core";

export interface ITerraformDisplayContext extends ITaskContext {
    secureVarsFile: string | undefined;
    planFilePath: string;
}

export class TerraformDisplayContext extends AzdoTaskContext implements ITerraformDisplayContext {
    constructor(tasks: ITaskLib) {
        super(tasks);        
    }
    get cwd(){
        return this.getInput("workingDirectory") || "./"
    }    
    get secureVarsFile(){
        return this.getInput("secureVarsFile");
    }
    get planFilePath(){
        return this.getInput("planFilePath") || "tfplan";
    }
}

export class MockTerraformDisplayContext extends MockTaskContext implements ITerraformDisplayContext {
    secureVarsFile: string | undefined = "";
    planFilePath: string = "";
}
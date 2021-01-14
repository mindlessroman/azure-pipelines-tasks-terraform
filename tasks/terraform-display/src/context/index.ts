import { AzdoTaskContext, ITaskContext } from "terraform-core";

export interface ITerraformDisplayContext extends ITaskContext {
    secureVarsFile: string | undefined;
    planFilePath: string;
}

export class TerraformDisplayContext extends AzdoTaskContext implements ITerraformDisplayContext {
    get secureVarsFile(){
        return this.getInput("secureVarsFile");
    }
    get planFilePath(){
        return this.getInput("planFilePath") || "tfplan";
    }
}
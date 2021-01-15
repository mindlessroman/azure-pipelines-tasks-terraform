import { ITaskContext } from ".";

export default class MockTaskContext implements ITaskContext {
    
    name: string = "";
    cwd: string = "";
    commandOptions?: string | undefined;
    secureVarsFileId: string = "";
    secureVarsFileName: string = "";
    backendType: string = "";
    ensureBackend?: boolean | undefined;
    backendServiceArm: string = "";
    backendAzureRmResourceGroupName: string = "";
    backendAzureRmResourceGroupLocation: string = "";
    backendAzureRmStorageAccountName: string = "";
    backendAzureRmStorageAccountSku: string = "";
    backendAzureRmContainerName: string = "";
    backendAzureRmKey: string = "";
    backendServiceArmAuthorizationScheme: string = "";
    backendServiceArmSubscriptionId: string = "";
    backendServiceArmTenantId: string = "";
    backendServiceArmClientId: string = "";
    backendServiceArmClientSecret: string = "";
    environmentServiceName?: string | undefined;    
    environmentServiceArmAuthorizationScheme: string = "";
    environmentServiceArmClientId: string = "";
    environmentServiceArmClientSecret: string = "";
    environmentServiceArmSubscriptionId: string = "";
    environmentServiceArmTenantId: string = "";
    aiInstrumentationKey?: string | undefined;
    allowTelemetryCollection: boolean = true;
    resourceAddress: string = "";
    resourceId: string = "";
    lockId: string = "";
    planOrStateFilePath: string = "";
    runAzLogin?: boolean = false;
    public readonly startedAt: [number, number];
    private _finishedAt: [number, number] | undefined;
    runTime: number = 0;

    constructor() {
        this.startedAt = process.hrtime();
    }

    public readonly variables: { [key: string]: { val: string, secret?: boolean }} = {};    

    public setVariable(name: string, val: string, secret?: boolean){
        this.variables[name] = { val, secret };
    }

    get finishedAt(){
        return this._finishedAt;
    }

    public finished() {
        this._finishedAt = process.hrtime(this.startedAt);
        this.runTime = this._finishedAt[1] / 1000000
    }
}
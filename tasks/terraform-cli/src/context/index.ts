export interface ITaskContext {
    name: string;
    cwd: string;
    commandOptions?: string;
    secureVarsFileId: string;
    secureVarsFileName: string;
    backendType?: string;
    ensureBackend?: boolean;
    backendServiceArm: string;
    backendAzureRmResourceGroupName: string;
    backendAzureRmResourceGroupLocation: string;
    backendAzureRmStorageAccountName: string;
    backendAzureRmStorageAccountSku: string;
    backendAzureRmContainerName: string;
    backendAzureRmKey: string;
    backendServiceArmAuthorizationScheme: string;
    backendServiceArmSubscriptionId: string;
    backendServiceArmTenantId: string;
    backendServiceArmClientId: string;
    backendServiceArmClientSecret: string;
    environmentServiceName?: string;
    environmentServiceArmAuthorizationScheme: string;
    environmentServiceArmClientId: string;
    environmentServiceArmClientSecret: string;
    environmentServiceArmSubscriptionId: string;
    environmentServiceArmTenantId: string;
    aiInstrumentationKey?: string;
    allowTelemetryCollection: boolean;
    resourceAddress: string;
    resourceId: string;
    lockId: string;
    planOrStateFilePath: string;
    setVariable: (name: string, val: string, secret?: boolean | undefined) => void;
    runTime: number;
    finished: () => void;
}

export { default as AzdoTaskContext } from './azdo-task-context';
export { default as MockTaskContext } from './mock-task-context';
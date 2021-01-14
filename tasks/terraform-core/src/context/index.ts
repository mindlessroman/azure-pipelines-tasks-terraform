import { ProxyConfiguration } from 'azure-pipelines-task-lib';

export interface ITaskContext {
    name: string;
    cwd: string;
    commandOptions?: string;
    allowTelemetryCollection: boolean;
    setVariable: (name: string, val: string, secret?: boolean | undefined) => void;
    runTime: number;
    finished: () => void;
    adoOrganizationUri: string;
    adoAccessToken: string;
}

export { default as AzdoTaskContext } from './azdo-task-context';
export { default as MockTaskContext } from './mock-task-context';
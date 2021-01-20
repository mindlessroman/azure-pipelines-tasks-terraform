import { ProxyConfiguration } from "azure-pipelines-task-lib"

export interface ITaskAgent {
    downloadSecureFile(secureFileId: string): Promise<string>
}

export interface ITaskAgentLib {
    getVariable: (name: string) => string | undefined;
    getEndpointAuthorizationParameter: (id: string, key: string, optional: boolean) => string | undefined;
    getHttpProxyConfiguration: (requestUrl?: string) => ProxyConfiguration | null;
    resolve: (...pathSegments: any[]) => string;
    getSecureFileTicket: (id: string) => string | undefined;
    debug: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    getSecureFileName: (id: string) => string | undefined;
}

export { default as AzdoTaskAgent } from './azdo-task-agent';
export { default as MockTaskAgent } from './mock-task-agent';
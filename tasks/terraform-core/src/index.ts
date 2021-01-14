import { ProxyConfiguration } from "azure-pipelines-task-lib"
import { TaskResult } from 'azure-pipelines-task-lib/task';
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner"
import { WriteFileOptions } from "fs"

export interface ITaskLib{
    getInput: (name: string, required?: boolean | undefined) => string | undefined;
    getBoolInput: (name: string, required?: boolean | undefined) => boolean;
    getEndpointAuthorizationScheme: (id: string, optional: boolean) => string | undefined;
    getEndpointDataParameter: (id: string, key: string, optional: boolean) => string | undefined;
    getEndpointAuthorizationParameter: (id: string, key: string, optional: boolean) => string | undefined;
    getSecureFileName: (id: string) => string | undefined;
    getVariable: (name: string) => string | undefined;
    setVariable: (name: string, val: string, secret?: boolean | undefined) => void;
    getHttpProxyConfiguration: (requestUrl?: string) => ProxyConfiguration | null;
    debug: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    resolve: (...pathSegments: any[]) => string;
    getSecureFileTicket: (id: string) => string | undefined;
    which: (tool: string, check?: boolean) => string;
    tool: (tool: string) => ToolRunner;
    writeFile: (file: string, data: string | Buffer, options?: BufferEncoding | WriteFileOptions) => void;
    addAttachment: (type: string, name: string, path: string) => void;
    setResult: (result: TaskResult, message: string, done?: boolean) => void;
}

export * from "./task-agents"
export * from "./runners"
export * from "./context"
export * from "./loggers"
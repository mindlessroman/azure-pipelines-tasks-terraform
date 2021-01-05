export interface ITaskAgent {
    downloadSecureFile(secureFileId: string): Promise<string>
}

export { default as AzdoTaskAgent } from './azdo-task-agent';
export { default as MockTaskAgent } from './mock-task-agent';
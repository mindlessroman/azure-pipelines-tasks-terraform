import fs from 'fs';
import Q from 'q';
import * as tasks from 'azure-pipelines-task-lib/task';
import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi';
import { ITaskAgent } from '.';

export default class TaskAgent implements ITaskAgent {
    private readonly api: WebApi;

    constructor() {
        const url = tasks.getVariable('System.TeamFoundationCollectionUri') || "";
        const credentials = tasks.getEndpointAuthorizationParameter('SYSTEMVSSCONNECTION', 'ACCESSTOKEN', false) || "";
        const authHandler = getPersonalAccessTokenHandler(credentials);

        const proxy = tasks.getHttpProxyConfiguration();
        const options = proxy ? { proxy, ignoreSslError: true } : undefined;
        
        this.api = new WebApi(url, authHandler, options);
    }

    async downloadSecureFile(secureFileId: string): Promise<string>{
        const fileName = tasks.getSecureFileName(secureFileId);
        tasks.debug(`Secure file id '${secureFileId}' resolved as file '${fileName}'`)
        const filePath = tasks.resolve(tasks.getVariable('Agent.TempDirectory'), fileName);
        tasks.debug(`Ensuring secure file available on agent at path: ${filePath}`);
        if(fs.existsSync(filePath)){
            tasks.debug('Secure file already exists at target path. Skipping download.');
        }
        else{
            const agent: ITaskAgentApi = await this.api.getTaskAgentApi();
            const file: NodeJS.WritableStream = fs.createWriteStream(filePath);
            const ticket = tasks.getSecureFileTicket(secureFileId);
            if(!ticket){
                throw new Error(`Download ticket for SecureFileId ${secureFileId} not found.`);
            }
            const project = tasks.getVariable('SYSTEM.TEAMPROJECT') || "";
            const stream: NodeJS.WritableStream = (await agent.downloadSecureFile(project, secureFileId, ticket, false)).pipe(file);
            const deferred = Q.defer();
            stream.on('finish', () => { deferred.resolve(); });
            await deferred.promise;
        }
        tasks.debug(`Secure file available at: ${filePath}`);
        return filePath;
    }
}
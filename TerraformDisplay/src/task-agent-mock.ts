export default class TaskAgentMock{
    constructor() {
    }

    async downloadSecureFile(secureFileId: string): Promise<string> {
        const secureFileEnv = `SECUREFILE_NAME_${secureFileId}`;        
        const filePath = process.env[secureFileEnv];

        if(!filePath){
            throw `Secure file ${secureFileId} not found. Did you add 'inputSecureFile' into your scenario pipeline?`
        }
        
        return Promise.resolve(filePath);
    }
}
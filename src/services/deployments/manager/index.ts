import { DeploymentsConnection } from './connection/index.js';
import { DeploymentManagerApi } from './routes/index.js';

export class DeploymentsManager {
  private api: DeploymentManagerApi;

  constructor() {
    this.api = new DeploymentManagerApi();
  }

  public async start() {
    try {
      const dbClient = await DeploymentsConnection();

      if (!dbClient) {
        throw new Error('Failed to connect to the database');
      }

      this.api.setup(dbClient);
    } catch (error) {
      throw error;
    }

    this.api.start();
  }
}

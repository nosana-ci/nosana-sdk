import { DeploymentsConnection } from './connection/index.js';
import { DeploymentManagerListener } from './listeners/index.js';
import { DeploymentManagerApi } from './routes/index.js';

export class DeploymentsManager {
  private api: DeploymentManagerApi;
  private listeners: DeploymentManagerListener;

  constructor() {
    this.api = new DeploymentManagerApi();
    this.listeners = new DeploymentManagerListener();
  }

  public async start() {
    try {
      const dbClient = await DeploymentsConnection();

      if (!dbClient) {
        throw new Error('Failed to connect to the database');
      }

      this.api.setup(dbClient);
      this.listeners.setup(dbClient);
    } catch (error) {
      throw error;
    }

    this.api.start();
    this.listeners.start();
  }
}

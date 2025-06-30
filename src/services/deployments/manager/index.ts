import { startDeploymentManagerApi } from './routes/index.js';
import { DeploymentsConnection } from './connection/index.js';
import { startDeploymentManagerListeners } from './listeners/index.js';

export async function startDeploymentManager() {
  try {
    const dbClient = await DeploymentsConnection();

    if (!dbClient) {
      throw new Error('Failed to connect to the database');
    }

    startDeploymentManagerListeners(dbClient);
    startDeploymentManagerApi(dbClient);
  } catch (error) {
    throw error;
  }
}

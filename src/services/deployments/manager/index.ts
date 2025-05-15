import express, { Express } from 'express';

import { DeploymentsConnection } from './connection/index.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { deploymentsHandler, deploymentIdHandler } from './routes/get/index.js';
import {
  deploymentCreateHandler,
  vaultWidthdrawHandler,
} from './routes/post/index.js';
import { vaultUpdateBalanceHandler } from './routes/patch/index.js';

export class DeploymentsManager {
  private app: Express;

  constructor() {
    this.app = express();
  }

  public async start() {
    try {
      const dbClient = await DeploymentsConnection();

      if (!dbClient) {
        throw new Error('Failed to connect to the database');
      }

      this.app.use((_, res, next) => {
        res.locals.db = {
          deployments: dbClient.collection('deployments'),
          events: dbClient.collection('events'),
          vaults: dbClient.collection('vaults'),
        };
        next();
      });
    } catch (error) {
      throw error;
    }

    this.app.use(express.json());
    this.app.use(authMiddleware);

    // Deployments
    this.app.get('/api/deployments', deploymentsHandler);
    this.app.get('/api/deployment/:id', deploymentIdHandler);
    this.app.post('/api/deployment/create', deploymentCreateHandler);

    // Vault
    this.app.post('/api/vault/:id/widthdraw', vaultWidthdrawHandler);
    this.app.patch('/api/vault/:id/update-balance', vaultUpdateBalanceHandler);

    this.app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  }
}

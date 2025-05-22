import express, { Express } from 'express';
import { Db } from 'mongodb';

import { authMiddleware } from '../middleware/authMiddleware';

import { deploymentIdHandler, deploymentsHandler } from './get';
import {
  deploymentCreateHandler,
  deploymentStartHandler,
  vaultWidthdrawHandler,
} from './post';
import {
  deploymentUpdateTimeoutHandler,
  vaultUpdateBalanceHandler,
} from './patch';
import { CollectionsNames } from '../definitions/collection';
import { Collections } from '../types';
import { deploymentDeleteHandler } from './delete/deployments/[id]/deleteDeployment';

export class DeploymentManagerApi {
  private app: Express;

  constructor() {
    this.app = express();
  }

  public setup(db: Db) {
    const collections: Collections = CollectionsNames.reduce(
      (collections, name) => {
        // @ts-ignore
        collections[name] = db.collection(name);
        return collections;
      },
      {} as Collections,
    );

    this.app.use((_, res, next) => {
      res.locals.db = collections;
      next();
    });

    this.app.use(express.json());
    this.app.use(authMiddleware);
    this.setupDeploymentsRoutes();
    this.setupVaultRoutes();
  }

  private setupDeploymentsRoutes() {
    this.app.get('/api/deployments', deploymentsHandler);
    this.app.get('/api/deployment/:id', deploymentIdHandler);
    this.app.post('/api/deployment/create', deploymentCreateHandler);
    this.app.post('/api/deployment/:id/start', deploymentStartHandler);
    this.app.patch(
      '/api/deployment/:id/update-timeout',
      deploymentUpdateTimeoutHandler,
    );
    this.app.delete('/api/deployment/:id', deploymentDeleteHandler);
  }

  private setupVaultRoutes() {
    this.app.post('/api/vault/:id/widthdraw', vaultWidthdrawHandler);
    this.app.patch('/api/vault/:id/update-balance', vaultUpdateBalanceHandler);
  }

  start() {
    this.app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  }
}

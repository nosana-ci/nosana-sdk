import { Db } from 'mongodb';
import express, { Express } from 'express';

import { CollectionsNames } from '../definitions/collection';

import {
  authMiddleware,
  getDeploymentMiddleware,
  getVaultMiddleware,
  validateActiveDeploymentMiddleware,
} from '../middleware';

import { deploymentIdHandler, deploymentsHandler } from './get';
import {
  deploymentCreateHandler,
  deploymentStartHandler,
  vaultWidthdrawHandler,
} from './post';
import {
  deploymentArchiveHandler,
  deploymentUpdateTimeoutHandler,
  vaultUpdateBalanceHandler,
} from './patch';

import { Collections } from '../types';

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
    // GET
    this.app.get('/api/deployments', deploymentsHandler);
    this.app.get(
      '/api/deployment/:deployment',
      getDeploymentMiddleware,
      deploymentIdHandler,
    );
    // POST
    this.app.post('/api/deployment/create', deploymentCreateHandler);
    this.app.post(
      '/api/deployment/:deployment/start',
      getDeploymentMiddleware,
      validateActiveDeploymentMiddleware,
      deploymentStartHandler,
    );
    // PATCH
    this.app.patch(
      '/api/deployment/:deployment/update-timeout',
      getDeploymentMiddleware,
      validateActiveDeploymentMiddleware,
      deploymentUpdateTimeoutHandler,
    );
    this.app.patch(
      '/api/deployment/:deployment/archive',
      getDeploymentMiddleware,
      validateActiveDeploymentMiddleware,
      deploymentArchiveHandler,
    );
  }

  private setupVaultRoutes() {
    this.app.post(
      '/api/vault/:vault/widthdraw',
      getVaultMiddleware,
      vaultWidthdrawHandler,
    );
    this.app.patch(
      '/api/vault/:vault/update-balance',
      getVaultMiddleware,
      vaultUpdateBalanceHandler,
    );
  }

  start() {
    this.app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  }
}

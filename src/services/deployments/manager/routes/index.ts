import { Db } from 'mongodb';
import express from 'express';

import { CollectionsNames } from '../definitions/collection';

import { authMiddleware } from './middleware';

import { Collections } from '../types';
import { setupDeploymentsRoutes, setupVaultRoutes } from './setup';

export function startDeploymentManagerApi(db: Db) {
  const app = express();

  const collections = CollectionsNames.reduce((collections, name) => {
    // @ts-ignore
    collections[name] = db.collection(name);
    return collections;
  }, {} as Collections);

  app.use((_, res, next) => {
    res.locals.db = collections;
    next();
  });

  app.use(express.json());
  app.use(authMiddleware);
  setupDeploymentsRoutes(app);
  setupVaultRoutes(app);

  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
}

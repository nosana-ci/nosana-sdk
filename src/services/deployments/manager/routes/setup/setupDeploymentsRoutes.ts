import { Express } from 'express';

import {
  getDeploymentMiddleware,
  validateActiveDeploymentMiddleware,
} from '../middleware';

import { deploymentIdHandler, deploymentsHandler } from '../routes/get';
import {
  deploymentCreateHandler,
  deploymentStartHandler,
  deploymentStopHandler,
} from '../routes/post';
import {
  deploymentArchiveHandler,
  deploymentUpdateTimeoutHandler,
} from '../routes/patch';

export function setupDeploymentsRoutes(app: Express) {
  // GET
  app.get('/api/deployments', deploymentsHandler);
  app.get(
    '/api/deployment/:deployment',
    getDeploymentMiddleware,
    deploymentIdHandler,
  );
  // POST
  app.post('/api/deployment/create', deploymentCreateHandler);
  app.post(
    '/api/deployment/:deployment/start',
    getDeploymentMiddleware,
    validateActiveDeploymentMiddleware,
    deploymentStartHandler,
  );
  app.post(
    '/api/deployment/:deployment/stop',
    getDeploymentMiddleware,
    validateActiveDeploymentMiddleware,
    deploymentStopHandler,
  );
  // PATCH
  app.patch(
    '/api/deployment/:deployment/archive',
    getDeploymentMiddleware,
    validateActiveDeploymentMiddleware,
    deploymentArchiveHandler,
  );
  app.patch(
    '/api/deployment/:deployment/update-timeout',
    getDeploymentMiddleware,
    validateActiveDeploymentMiddleware,
    deploymentUpdateTimeoutHandler,
  );
}

import { Db } from 'mongodb';

import { startDeploymentListener } from './deployments';
import { startTaskListener } from '../tasks';

export function startDeploymentManagerListeners(db: Db) {
  startDeploymentListener(db);
  startTaskListener(db);
}

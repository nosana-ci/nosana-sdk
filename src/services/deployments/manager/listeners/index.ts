import { Db } from 'mongodb';

import { DeploymentListener } from './deployments';
import { TaskListener } from './tasks';

export class DeploymentManagerListener {
  private deployments: DeploymentListener | undefined;
  private tasks: TaskListener | undefined;

  setup(db: Db) {
    this.deployments = new DeploymentListener(db);
    this.tasks = new TaskListener(db);
  }

  start() {
    if (!this.deployments || !this.tasks) {
      throw new Error(
        'Listener setup is required before starting the service.',
      );
    }

    this.deployments.start();
    this.tasks.start();
  }
}

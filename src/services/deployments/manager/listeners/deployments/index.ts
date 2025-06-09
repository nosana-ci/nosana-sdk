import { Collection, Db } from 'mongodb';

import { Listener } from '../listener';

import { DeploymentDocument, DeploymentStatus, TaskType } from '../../types';
import { scheduleTask } from '../tasks/scheduleTask';

export class DeploymentListener {
  private db: Db;
  private collection: Collection<DeploymentDocument>;
  private listener: Listener<DeploymentDocument> | undefined;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection('deployments');
    this.listener = new Listener(db, 'deployments');
  }

  start() {
    if (!this.listener) {
      throw new Error(
        'Listener setup is required before starting the service.',
      );
    }

    this.listener.addListener(
      'update',
      ({ id }) => scheduleTask(this.db, TaskType.LIST, id),
      {
        status: { $eq: DeploymentStatus.STARTING },
      },
    );

    this.listener.addListener(
      'update',
      ({ id }) => scheduleTask(this.db, TaskType.STOP, id),
      {
        status: { $eq: DeploymentStatus.STOPPING },
      },
    );

    this.listener.start();
  }
}

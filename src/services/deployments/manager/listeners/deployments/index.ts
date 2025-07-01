import { Db } from 'mongodb';

import { createCollectionListener, CollectionListener } from '../listener';
import { getNextTaskTime } from '../../tasks/utils';
import { scheduleTask } from '../../tasks/scheduleTask';

import {
  DeploymentDocument,
  DeploymentStatus,
  DeploymentStrategy,
  TaskType,
} from '../../types';

export function startDeploymentListener(db: Db) {
  const listener: CollectionListener<DeploymentDocument> =
    createCollectionListener('deployments', db);

  if (!listener) {
    throw new Error('Listener setup is required before starting the service.');
  }

  listener.addListener(
    'update',
    ({ id, strategy, schedule }) =>
      scheduleTask(
        db,
        TaskType.LIST,
        id,
        strategy === DeploymentStrategy.SCHEDULED
          ? getNextTaskTime(schedule, new Date())
          : undefined,
      ),
    {
      status: { $eq: DeploymentStatus.STARTING },
    },
  );

  listener.addListener(
    'update',
    ({ id }) => scheduleTask(db, TaskType.STOP, id),
    {
      status: { $eq: DeploymentStatus.STOPPING },
    },
  );

  listener.start();
}

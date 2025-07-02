import { Db } from 'mongodb';

import { scheduleTask } from '../../../scheduleTask';

import {
  DeploymentStatus,
  TaskType,
  DeploymentCollection,
  OutstandingTasksDocument,
} from '../../../../types';

export async function onExtendExit(
  errorStatus: DeploymentStatus | undefined,
  deployments: DeploymentCollection,
  { deploymentId, deployment: { timeout } }: OutstandingTasksDocument,
  db: Db,
) {
  if (errorStatus) {
    deployments.updateOne(
      {
        id: {
          $eq: deploymentId,
        },
      },
      {
        $set: {
          status: errorStatus,
        },
      },
    );
    return;
  }

  scheduleTask(
    db,
    TaskType.EXTEND,
    deploymentId,
    new Date(new Date().getTime() + timeout * 0.9 * 60 * 1000),
  );
}

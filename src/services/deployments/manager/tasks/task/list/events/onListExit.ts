import { Db } from 'mongodb';

import { OnListEventParams } from '../spawner';
import { getNextTaskTime } from '../../../utils';
import { scheduleTask } from '../../../scheduleTask';

import {
  DeploymentStatus,
  DeploymentStrategy,
  TaskType,
} from '../../../../types';

export async function onListExit(
  {
    error,
    collections: { tasks, documents },
    task: {
      deploymentId,
      deployment: { timeout, strategy, schedule },
      due_at,
    },
  }: OnListEventParams,
  db: Db,
) {
  if (!error) {
    if (strategy === DeploymentStrategy['SIMPLE-EXTEND']) {
      scheduleTask(
        db,
        TaskType.EXTEND,
        deploymentId,
        new Date(new Date().getTime() + timeout * 0.9 * 60 * 1000),
      );
    }

    if (strategy === DeploymentStrategy.SCHEDULED && schedule) {
      const nextTaskTime = getNextTaskTime(schedule, due_at);
      await tasks.insertOne({
        task: TaskType.LIST,
        due_at: nextTaskTime,
        deploymentId: deploymentId,
        tx: undefined,
        created_at: new Date(),
      });
    }
  }

  documents.updateOne(
    {
      id: { $eq: deploymentId },
    },
    {
      $set: {
        status: error || DeploymentStatus.RUNNING,
      },
    },
  );
}

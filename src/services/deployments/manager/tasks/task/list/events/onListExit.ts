import { OnListEventParams } from '../spawner';
import { getNextTaskTime } from '../../../utils';

import {
  DeploymentStatus,
  DeploymentStrategy,
  TaskType,
} from '../../../../types';

export async function onListExit({
  error,
  collections: { tasks, documents },
  task,
}: OnListEventParams) {
  if (!error) {
    if (task.deployment.strategy === DeploymentStrategy['SIMPLE-EXTEND']) {
      await tasks.insertOne({
        task: TaskType.EXTEND,
        due_at: new Date(
          new Date().getSeconds() + task.deployment.timeout / 0.9,
        ),
        tx: undefined,
        deploymentId: task.deploymentId,
        created_at: new Date(),
      });
    }

    if (task.deployment.strategy === DeploymentStrategy.SCHEDULED) {
      const nextTaskTime = getNextTaskTime(
        task.deployment.schedule,
        task.due_at,
      );
      await tasks.insertOne({
        task: TaskType.LIST,
        due_at: nextTaskTime,
        deploymentId: task.deploymentId,
        tx: undefined,
        created_at: new Date(),
      });
    }
  }

  documents.updateOne(
    {
      id: { $eq: task.deploymentId },
    },
    {
      $set: {
        status: error || DeploymentStatus.RUNNING,
      },
    },
  );
}

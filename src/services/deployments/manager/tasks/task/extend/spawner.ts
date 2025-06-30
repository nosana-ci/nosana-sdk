import { Db } from 'mongodb';

import { Config } from '../../../../../../config';
import { VAULT_PATH } from '../../../definitions/vault';
import { OutstandingTasksDocument } from '../../getOutstandingTasks';

import { Worker } from '../Worker';

import {
  DeploymentStatus,
  EventDocument,
  TaskDocument,
  TaskType,
} from '../../../types';

export function spawnExtendTask(
  db: Db,
  task: OutstandingTasksDocument,
  complete: () => void,
): Worker {
  let errorType: DeploymentStatus;

  const tasks = db.collection<TaskDocument>('tasks');
  const events = db.collection<EventDocument>('events');

  const worker = new Worker('./extend/worker.ts', {
    workerData: {
      task,
      vault: `${VAULT_PATH}${task.deployment.vault.toString()}.json`,
      config: new Config(),
    },
  });

  worker.on(
    'message',
    ({
      event,
      error,
      job,
    }: {
      event: 'CONFIRMED' | string;
      error?: any;
      job: string;
    }) => {
      switch (event) {
        case 'CONFIRMED':
          events.insertOne({
            deploymentId: task.deploymentId,
            category: 'Deployment',
            type: 'JOB_EXTEND_SUCCESSFUL',
            message: `Successfully extended job - ${job}`,
            created_at: new Date(),
          });
          break;
        case 'ERROR':
          events.insertOne({
            deploymentId: task.deploymentId,
            category: 'Deployment',
            type: 'JOB_EXTEND_FAILED',
            message:
              error instanceof Error
                ? error.message
                : typeof error === 'object'
                ? JSON.stringify(error)
                : error,
            created_at: new Date(),
          });
          if (typeof error === 'object' && error.InsufficientFundsForRent) {
            errorType = DeploymentStatus.INSUFFICIENT_FUNDS;
          }
          errorType = DeploymentStatus.ERROR;
          break;
      }
    },
  );

  worker.on('exit', async (_code) => {
    if (!errorType) {
      tasks.insertOne({
        task: TaskType.EXTEND,
        due_at: new Date(
          new Date().getTime() +
            Math.min(360, task.deployment.timeout / 0.9) * 1000,
        ),
        deploymentId: task.deploymentId,
        tx: undefined,
        created_at: new Date(),
      });
    }

    complete();
  });

  return worker;
}

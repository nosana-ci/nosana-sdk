import path from 'path';
import { Db } from 'mongodb';
import { fileURLToPath } from 'url';

import { Config } from '../../../../../../../config';
import { VAULT_PATH } from '../../../../definitions/vault';
import { OutstandingTasksDocument } from '../../getOutstandingTasks';

import { Worker } from '../Worker';
import {
  DeploymentDocument,
  DeploymentStatus,
  DeploymentStrategy,
  TaskDocument,
  TaskType,
} from '../../../../types';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function spawnListTask(
  db: Db,
  task: OutstandingTasksDocument,
  complete: () => void,
): Worker {
  const deploymentCollection = db.collection<DeploymentDocument>('deployments');
  const jobsCollection = db.collection('jobs');
  const tasksCollection = db.collection<TaskDocument>('tasks');

  const worker = new Worker('./list/worker.ts', {
    workerData: {
      task,
      vaultKeyPath: `${VAULT_PATH}${task.deployment.vault.toString()}.json`,
      config: new Config(),
    },
  });

  worker.on(
    'message',
    ({
      event,
      deployment,
      job,
      run,
      tx,
    }: {
      event: 'CONFIRMED' | string;
      deployment: string;
      job: string;
      run: string;
      tx: string;
    }) => {
      switch (event) {
        case 'CONFIRMED':
          jobsCollection.insertOne({
            job,
            deployment,
            run,
            tx,
            created_at: new Date(),
          });
      }
    },
  );

  worker.on('exit', async (code) => {
    if (code === 0) {
      if ((task.deployment.strategy = DeploymentStrategy['SIMPLE-EXTEND'])) {
        await tasksCollection.insertOne({
          task: TaskType.EXTEND,
          due_at: new Date(
            new Date().getSeconds() + task.deployment.timeout / 0.9,
          ),
          deploymentId: task.deploymentId,
          tx: undefined,
          created_at: new Date(),
        });
      }

      await deploymentCollection.updateOne(
        {
          id: { $eq: task.deploymentId },
        },
        {
          $set: {
            status: DeploymentStatus.RUNNING,
          },
        },
      );
    }
    // TODO: check errors and update deployment with Error or Insufficient funds
    complete();
  });

  return worker;
}

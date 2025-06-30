import { Db } from 'mongodb';

import { Worker } from '../Worker';
import { Config } from '../../../../../../config';
import { VAULT_PATH } from '../../../definitions/vault';
import { OutstandingTasksDocument } from '../../getOutstandingTasks';

export function spawnStopTask(
  db: Db,
  task: OutstandingTasksDocument,
  complete: () => void,
): Worker {
  const worker = new Worker('./stop/worker.ts', {
    workerData: {
      task,
      vault: `${VAULT_PATH}${task.deployment.vault.toString()}.json`,
      config: new Config(),
    },
  });

  worker.on('exit', () => {
    complete();
  });

  return worker;
}

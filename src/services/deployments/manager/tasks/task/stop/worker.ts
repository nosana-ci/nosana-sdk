import fs from 'fs';
import { register } from 'ts-node';
import { parentPort, workerData } from 'worker_threads';

import { Client, ClientConfig } from '../../../../../../client';

import { OutstandingTasksDocument } from '../../../types';

register();

type WorkerData = {
  task: OutstandingTasksDocument;
  vault: string;
  config: ClientConfig;
};

const { task, vault, config } = workerData as WorkerData;

const client = new Client('mainnet', fs.readFileSync(vault, 'utf8'), config);

for (const { job } of task.jobs) {
  try {
    const { state } = await client.jobs.get(job);

    if (state === 'QUEUED') {
      const res = await client.jobs.delist(job);
      if (res) {
        parentPort!.postMessage({
          event: 'CONFIRMED',
          ...res,
        });
      }
    }

    if (state === 'RUNNING') {
      const res = await client.jobs.end(job);
      if (res) {
        parentPort!.postMessage({
          event: 'CONFIRMED',
          ...res,
        });
      }
    }
  } catch (error) {
    parentPort!.postMessage({
      event: 'ERROR',
      error,
    });
  }
}

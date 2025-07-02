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

const {
  deployment: { timeout },
  jobs,
} = task;

for (const { job } of jobs) {
  try {
    const res = await client.jobs.extend(job, timeout);
    if (res) {
      parentPort?.postMessage({
        event: 'CONFIRMED',
        ...res,
      });
    }
  } catch (error) {
    parentPort?.postMessage({
      event: 'ERROR',
      error,
    });
  }
}

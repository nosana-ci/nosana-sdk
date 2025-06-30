import fs from 'fs';
import { register } from 'ts-node';
import { parentPort, workerData } from 'worker_threads';

import { Client, ClientConfig } from '../../../../../../client';
import { OutstandingTasksDocument } from '../../getOutstandingTasks';

register();

type WorkerData = {
  task: OutstandingTasksDocument;
  vault: string;
  config: ClientConfig;
};

const { task, vault, config } = workerData as WorkerData;

const client = new Client('mainnet', fs.readFileSync(vault, 'utf8'), config);

const { jobs } = task;

jobs.forEach(async ({ job }) => {
  try {
    const { state } = await client.jobs.get(job);

    if (state === 'QUEUED') {
      await client.jobs.delist(job);
    }

    if (state === 'RUNNING') {
      await client.jobs.end(job);
    }
  } catch (error) {
    parentPort!.postMessage({
      event: 'ERROR',
      error,
    });
  }
});

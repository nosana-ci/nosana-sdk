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

const { ipfs_definition_hash, timeout, market, replicas } = task.deployment;

// TODO, convert to Single instruction
for (let i = 0; i < replicas; i++) {
  try {
    const res = await client.jobs
      .list(ipfs_definition_hash, timeout, market, undefined)
      .catch((err) => {
        parentPort!.postMessage({
          event: 'ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      });

    if (res) {
      parentPort!.postMessage({
        event: 'CONFIRMED',
        ...res,
      });
    }
  } catch (err) {
    parentPort!.postMessage({
      event: 'ERROR',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

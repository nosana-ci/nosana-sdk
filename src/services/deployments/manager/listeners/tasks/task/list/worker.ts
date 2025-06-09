import { register } from 'ts-node';
import { parentPort, workerData } from 'worker_threads';

import { Client, ClientConfig } from '../../../../../../../client';
import { OutstandingTasksDocument } from '../../getOutstandingTasks';

register();

type WorkerData = {
  task: OutstandingTasksDocument;
  vaultKeyPath: string;
  config: ClientConfig;
};

const { task, vaultKeyPath, config } = workerData as WorkerData;
const client = new Client('mainnet', vaultKeyPath, config);

const { id, ipfs_definition_hash, timeout, market, replicas } = task.deployment;

// TODO, convert to Single instruction
for (let i = 0; i < replicas; i++) {
  const { tx, job, run } = (await client.jobs.list(
    ipfs_definition_hash,
    timeout,
    market,
    undefined,
    true,
  )) as { tx: string; job: string; run: string };

  parentPort?.postMessage({
    event: 'CONFIRMED',
    deploymentId: id,
    job,
    run,
    tx,
  });
}

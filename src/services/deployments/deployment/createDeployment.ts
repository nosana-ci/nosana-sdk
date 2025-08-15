import { Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createVault } from './createVault.js';
import { SolanaConfig } from '../../../client.js';
import { QueryClient, components } from '../client/index.js';
import {
  deploymentStop,
  deploymentStart,
  deploymentArchive,
  deploymentUpdateReplicaCount,
  deploymentGetTasks,
  deploymentUpdateTimeout,
} from './actions/index.js';

import { Deployment, DeploymentState } from '../types.js';

export interface CreateDeploymentOptions {
  client: QueryClient;
  wallet: Wallet;
  solanaConfig: SolanaConfig;
}

export function createDeployment(
  deployment: components['schemas']['Deployment'],
  { client, wallet, solanaConfig }: CreateDeploymentOptions,
): Deployment {
  const state: DeploymentState = {
    id: deployment.id,
    market: new PublicKey(deployment.market),
    owner: new PublicKey(deployment.owner),
    name: deployment.name,
    status: deployment.status,
    replicas: deployment.replicas,
    timeout: deployment.timeout,
    ipfs_definition_hash: deployment.ipfs_definition_hash,
    endpoints: deployment.endpoints,
    events: deployment.events,
    jobs: deployment.jobs,
    updated_at: new Date(deployment.updated_at),
    created_at: new Date(deployment.created_at),
    ...(deployment.strategy === 'SCHEDULED'
      ? {
          strategy: deployment.strategy,
          schedule: deployment.schedule,
        }
      : {
          strategy: deployment.strategy,
        }),
  };

  /**
   * @throws Error if the deployment is already running or starting
   * @throws Error if there is an error starting the deployment
   * @returns Promise<void>
   * @description Starts the deployment.
   */
  const start = async (): Promise<void> => {
    await deploymentStart(client, state);
  };

  /**
   * @throws Error if the deployment is already stopped
   * @throws Error if there is an error stopping the deployment
   * @returns Promise<void>
   * @description Stops the deployment.
   * This will halt the deployment and prevent further actions until it is started again.
   * It is useful for pausing deployments without archiving them.
   */
  const stop = async (): Promise<void> => {
    await deploymentStop(client, state);
  };

  /**
   * @throws Error if the deployment is not stopped
   * @throws Error if there is an error archiving the deployment
   * @returns Promise<void>
   * @description Archives the deployment.
   * This will mark the deployment as archived and prevent further modifications.
   * It is useful for cleaning up deployments that are no longer needed.
   */
  const archive = async () => {
    await deploymentArchive(client, state);
  };

  /**
   * @returns Promise<components["schemas"]["Task"][]>
   * @throws Error if there is an error fetching the tasks
   * @throws Error if the deployment is not found
   * @description Fetches the tasks for the deployment.
   * This will return the current tasks associated with the deployment.
   * It is useful for monitoring the deployment's progress and status.
   */
  const getTasks = async (): Promise<components['schemas']['Task'][]> => {
    return await deploymentGetTasks(client, state);
  };

  /**
   * @param replicas Number of replicas to set for the deployment
   * @throws Error if replicas is less than 1
   * @throws Error if there is an error updating the replica count
   * @returns Promise<void>
   * @description Updates the number of replicas for the deployment.
   * This will change the number of instances running for the deployment.
   */
  const updateReplicaCount = async (replicas: number) => {
    await deploymentUpdateReplicaCount(replicas, client, state);
  };

  /**
   * @param timeout Timeout in seconds
   * @throws Error if timeout is less than 60 seconds
   * @throws Error if there is an error updating the timeout
   * @returns Promise<void>
   * @description Updates the timeout for the deployment.
   * This will change the maximum time the deployment can run before it is stopped.
   */
  const updateTimeout = async (timeout: number) => {
    await deploymentUpdateTimeout(timeout, client, state);
  };

  return Object.assign(state, {
    vault: createVault(new PublicKey(deployment.vault), {
      client,
      wallet,
      solanaConfig,
    }),
    start,
    stop,
    archive,
    getTasks,
    updateReplicaCount,
    updateTimeout,
  });
}

import { Client } from '../../src';

import { NGINX_JOB, HELLO_JOB } from './jobs';

import { DeploymentStrategy } from '../../src/services/deployments/manager/types';

export async function createDeployment(client: Client) {
  const ipfs_definition_hash = await client.jobs.pinJobDefinition(HELLO_JOB);

  const deployment = await client.deployments.create({
    name: 'my first deployment',
    market: '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq',
    replicas: 2,
    timeout: 60,
    strategy: DeploymentStrategy.SIMPLE,
    ipfs_definition_hash,
  });

  return deployment;
}

import { Client } from '../../src';

import { NGINX_JOB, HELLO_JOB } from './jobs';

export async function createDeployment(client: Client) {
  const ipfs_definition_hash = await client.jobs.pinJobDefinition(HELLO_JOB);

  const deployment = await client.deployments.create({
    name: 'my first deployment',
    market: '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq',
    replicas: 1,
    timeout: 60,
    strategy: 'SIMPLE',
    ipfs_definition_hash,
  });

  return deployment;
}

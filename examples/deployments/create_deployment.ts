import { Client } from '../../src';
import { DeploymentStrategy } from '../../src/services/deployments/manager/types';

export async function createDeployment(client: Client) {
  const ipfs_definition_hash = await client.jobs.pinJobDefinition({
    version: '0.1',
    type: 'container',
    ops: [
      {
        type: 'container/run',
        id: 'hello-world',
        args: {
          cmd: 'echo hello world',
          image: 'ubuntu',
        },
      },
    ],
  });

  const deployment = await client.deployments.create({
    name: 'my first deployment',
    market: '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq',
    replicas: 1,
    timeout: 300,
    strategy: DeploymentStrategy.SIMPLE,
    ipfs_definition_hash,
  });

  console.log(deployment);
}

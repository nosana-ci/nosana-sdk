import { Deployment } from '../../src';
import { createTestClient } from './utils/createTestClient';
import { createDeployment } from './create_deployment';
import { sleep } from '../../src';
import { HELLO_JOB } from './jobs';

const client = createTestClient();

const args = process.argv.slice(2);

async function command() {
  let deployment: Deployment | undefined = undefined;
  switch (args[0]) {
    case 'listVaults':
      return await client.deployments.vaults.list();
    case 'createVault':
      return await client.deployments.vaults.create();
    case 'create':
      return await createDeployment(client);
    case 'list':
      return await client.deployments.list();
    case 'get':
      return await client.deployments.get(args[1]);
    case 'tasks':
      const dep = await client.deployments.get(args[1]);
      console.log(await dep.getTasks());
      break;
    case 'start':
      deployment = await client.deployments.get(args[1]);
      await deployment.start();
      return deployment;
    case 'stop':
      deployment = await client.deployments.get(args[1]);
      await deployment.stop();
      return deployment;
    case 'updateTimeout':
      deployment = await client.deployments.pipe(args[1], (deployment) =>
        deployment.updateTimeout(60 * 10),
      );
      return deployment;
    case 'archive':
      deployment = await client.deployments.get(args[1]);
      await deployment.archive();
      return deployment;
    case 'balance':
      deployment = await client.deployments.get(args[1]);
      return await deployment.vault.getBalance();
    case 'topup':
      deployment = await client.deployments.get(args[1]);
      await deployment.vault.topup({ SOL: 0.015, NOS: 0.5 });
      return await deployment.vault.getBalance();
    case 'header':
      deployment = await client.deployments.get(args[1]);
      console.log(await deployment.generateAuthHeader());
      return;
    case 'withdraw':
      deployment = await client.deployments.get(args[1]);
      await deployment.vault.withdraw();
      return await deployment.vault.getBalance();
    case 'withdraw-all':
      const deployments = await client.deployments.list();
      for (const deployment of deployments) {
        await deployment.vault.withdraw().catch(() => { });
      }
      return;
    case 'createAndDeploy':
      return await client.deployments.pipe(
        {
          name: 'my first deployment',
          market: '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq',
          replicas: 1,
          timeout: 60,
          strategy: 'SIMPLE',
          job_definition: HELLO_JOB,
        },
        async (deployment) => {
          console.log(`Successfully created deployment ${deployment.id}`);
          console.log('Topping up deployment vault');
          await deployment.vault.topup({ SOL: 0.015, NOS: 0.5 });
        },
        async (deployment) => {
          console.log('Starting deployment');
          await deployment.start();
        },
        async (deployment) => {
          console.log('Waiting 30 seconds for job to be deployed');
          await sleep(30);
          deployment = await client.deployments.get(deployment.id);
        },
        async (deployment) => {
          await sleep(5);
          console.log(`Withdrawing all tokens from vault`);
          await deployment.vault.withdraw();
        },
      );
  }
}

console.log(await command());

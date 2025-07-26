import { Deployment } from '../../src/services/deployments/deployment';
import { createTestClient } from './utils/createTestClient';
import { createDeployment } from './create_deployment';
import { sleep } from '../../src';

const client = createTestClient();

const args = process.argv.slice(2);

async function command() {
  let deployment: Deployment | undefined = undefined;
  switch (args[0]) {
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
      await deployment!.start();
      return deployment;
    case 'stop':
      deployment = await client.deployments.get(args[1]);
      await deployment!.stop();
      return deployment;
    case 'archive':
      deployment = await client.deployments.get(args[1]);
      await deployment!.archive();
      return deployment;
    case 'balance':
      deployment = await client.deployments.get(args[1]);
      return await deployment!.vault.getBalance();
    case 'topup':
      deployment = await client.deployments.get(args[1]);
      await deployment!.vault.topup({ SOL: 1, NOS: 100 });
      return await deployment!.vault.getBalance();
    case 'withdraw':
      deployment = await client.deployments.get(args[1]);
      await deployment!.vault.withdraw();
      return await deployment!.vault.getBalance();
    case 'withdraw-all':
      const deployments = await client.deployments.list();
      for (const deployment of deployments) {
        await deployment.vault.withdraw().catch(() => {});
      }
      return;
    case 'createAndDeploy':
      deployment = await createDeployment(client);
      console.log(`Successfully created deployment with id: ${deployment.id}`);
      console.log(`Topping up vault: ${deployment.vault.publicKey}`);
      await deployment.vault.topup({ SOL: 0.05, NOS: 0.05 });
      console.log('Starting deployment');
      await deployment.start();
      console.log('Waiting 30seconds for job to be deployed');
      await sleep(30);
      deployment = await client.deployments.get(deployment.id);
      console.log(deployment);
      await sleep(5);
      console.log(`Withdrawing all tokens from vault`);
      await deployment.vault.withdraw();
      return deployment;
  }
}

console.log(await command());

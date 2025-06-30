import { Deployment } from '../../src/services/deployments/deployment';
import { createTestClient } from '../utils/createTestClient';
import { createDeployment } from './create_deployment';

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
    case 'start':
      deployment = await client.deployments.get(args[1]);
      await deployment.start();
      return deployment;
    case 'stop':
      deployment = await client.deployments.get(args[1]);
      await deployment.stop();
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
      await deployment.vault.topup({ SOL: 0.05, NOS: 0.05 });
      return await deployment.vault.getBalance();
    case 'withdraw':
      deployment = await client.deployments.get(args[1]);
      await deployment.vault.widthdraw();
      return await deployment.vault.getBalance();
  }
}

console.log(await command());

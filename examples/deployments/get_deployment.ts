import { createTestClient } from '../utils/createTestClient';

const client = createTestClient();

const deployment = await client.deployments.get(
  '6P8j7TNNFQ6fRYVeVs6obRuUMmgLYDz63HMBd86jeFGe',
);

console.log(deployment.vault.publicKey);

console.log(await deployment.vault.getBalance());

await deployment.vault.topup({ SOL: 0.005, NOS: 0.1 });

console.log(await deployment.vault.getBalance());

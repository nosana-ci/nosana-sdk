import { createTestClient } from '../utils/createTestClient';

const client = createTestClient();

const deployment = await client.deployments.get(
  'qtyjTutjqVF7ZLzCDLpzrVYviCpq7vWJ22K8JWMgvFV',
);

console.log(deployment);

deployment.vault.topup({ sol: 0.005, nos: 0.1 });

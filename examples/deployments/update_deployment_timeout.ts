import { createTestClient } from '../utils/createTestClient';

const client = createTestClient();

const deployment = await client.deployments.get(
  '3WZEpmNKF4JzxPUbJn9nJwWAzZu1WJ5z7V7SBkHw55Gu',
);

await deployment.updateTimeout(parseInt(process.argv[2]) || 400);

console.log(deployment);

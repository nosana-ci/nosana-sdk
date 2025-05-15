import { createTestClient } from '../utils/createTestClient';

const client = createTestClient();

console.log(await client.deployments.list());

import { Client } from '../../src';

const client = new Client('mainnet');

await client.deployments.manager.start();

import { Client } from '../../src';

const client = new Client();

await client.deployments.manager.start();

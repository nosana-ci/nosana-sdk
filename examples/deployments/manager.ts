import { Client } from '../../src';

const client = new Client();

await client.deployments.manager.start();
console.log('Deployments manager started');

import fs from 'fs';
import os from 'os';
import { Wallet } from '@coral-xyz/anchor';

import { Client, sleep } from '../../src';
import type { ClientConfig } from '../../src/types';

const privateKey = fs.readFileSync(
  os.homedir() + '/.nosana/nosana_key.json',
  'utf8',
);

const config: ClientConfig = {
  solana: {
    network:
      'https://rpc.ironforge.network/mainnet?apiKey=01J4RYMAWZC65B6CND9DTZZ5BK',
    priority_fee: 10000,
    dynamicPriorityFee: false,
  },
};

const nosana: Client = new Client('mainnet', privateKey, config);
console.log(
  'Logged in as',
  (nosana.solana.wallet as Wallet).publicKey.toString(),
);

async function getMarketWithLargestQueue() {
  const markets = await nosana.jobs.allMarkets();
  return markets.sort((a, b) => b.queue.length - a.queue.length)[0];
}

(async () => {
  const market = await getMarketWithLargestQueue();
  console.log('Market with largest queue:', market.address.toString());

  const node = market.queue[market.queue.length - 1];
  console.log('Assigning job to last node in queue:', node.toString());

  const json_flow = {
    version: '0.1',
    type: 'container',
    meta: {
      trigger: 'cli',
    },
    ops: [
      {
        type: 'container/run',
        id: 'hello-world',
        args: {
          cmd: 'echo hello world',
          image: 'ubuntu',
        },
      },
    ],
  };
  const ipfsHash = await nosana.ipfs.pin(json_flow);
  console.log('ipfs uploaded!', nosana.ipfs.config.gateway + ipfsHash);
  const response = await nosana.jobs.list(ipfsHash, 60, market.address, node);
  console.log('job posted!', response);
  let job;
  // @ts-ignore
  while (!job || job.state !== 'COMPLETED') {
    console.log('checking job state..');
    job = await nosana.jobs.get(response.job);
    await sleep(5);
  }
  console.log('job done!');
  const result = await nosana.ipfs.retrieve(job.ipfsResult);
  console.log(result);
})();

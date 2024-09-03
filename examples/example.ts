import { Wallet } from '@coral-xyz/anchor';
import { Client } from '../src';
import type { ClientConfig } from '../src/types';
import { sleep } from '../src/utils';
import { PublicKey } from '@solana/web3.js';

const config: ClientConfig = {
  solana: {
    network: 'devnet',
  },
};

const nosana: Client = new Client('devnet', undefined, config);
console.log(
  'Logged in as',
  (nosana.solana.wallet as Wallet).publicKey.toString(),
);

(async () => {
  const json_flow = {
    ops: [
      {
        op: 'container/run',
        id: 'hello-world',
        args: {
          cmds: [
            {
              cmd: 'echo hello world',
            },
          ],
          image: 'ubuntu',
        },
      },
    ],
  };
  const ipfsHash = await nosana.ipfs.pin(json_flow);
  console.log('ipfs uploaded!', nosana.ipfs.config.gateway + ipfsHash);
  if (await nosana.solana.requestAirdrop(1e9)) {
    console.log(`Received airdrop of 1 SOL!`);
  }
  await sleep(3);
  const response = await nosana.jobs.list(ipfsHash);
  console.log('job posted!', response);
  let job;
  // @ts-ignore
  while (!job || parseInt(job.state) < 2) {
    console.log('checking job state..');
    job = await nosana.jobs.get(response.job);
    await sleep(5);
  }
  console.log('job done!');
  const result = await nosana.ipfs.retrieve(job.ipfsResult);
  console.log(result);
  const secrets = await nosana.secrets.get(response.job);
  console.log(secrets);
})();

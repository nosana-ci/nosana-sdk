import { Wallet } from '@coral-xyz/anchor';
import anchor from '@coral-xyz/anchor';
const { BN } = anchor;
import { Client } from '../src';
import type { ClientConfig } from '../src/types';

const config: ClientConfig = {
  solana: {
    network: 'https://rpc.hellomoon.io/853e30f5-383d-4cc6-a5ee-b5fb4c7a7178',
  },
};

const nosana: Client = new Client('mainnet', undefined, config);
(async () => {
  const response = await nosana.stake.all();
  let totalNos = new BN(0);
  let totalXNos = new BN(0);
  let totalDuration = new BN(0);
  let totalDurationW = new BN(0);
  for (let i = 0; i < response.length; i++) {
    totalNos = totalNos.add(response[i].account.amount);
    totalXNos = totalXNos.add(response[i].account.xnos);
    totalDuration = totalDuration.add(response[i].account.duration);
    totalDurationW = totalDurationW.add(
      response[i].account.duration.mul(response[i].account.amount),
    );
  }
  console.log('# stakers', response.length);
  console.log('total NOS staked', totalNos.toNumber() / 1e6);
  console.log('total xNOS score', totalXNos.toNumber() / 1e6);
  console.log(
    'average unstake duration (days)',
    totalDuration.toNumber() / response.length / 3600 / 24,
  );

  console.log(
    'weighted (on nos amount) unstake duration (days)',
    totalDurationW.div(totalNos).toNumber() / 3600 / 24,
  );
})();

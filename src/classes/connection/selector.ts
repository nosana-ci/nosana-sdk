import { Cluster, clusterApiUrl, Connection } from '@solana/web3.js';

import { Config } from '../../config';

export const ConnectionSelector = (): Connection => {
  let instance: Connection | undefined = undefined;

  if (!instance) {
    let node = new Config().solanaConfig.network;
    if (!node.includes('http')) {
      node = clusterApiUrl(node as Cluster);
    }

    instance = new Connection(node, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60 * 1000,
    });
  }

  return instance;
};

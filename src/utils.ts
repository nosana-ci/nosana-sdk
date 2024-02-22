import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import type { Job } from './types/index.js';
import { IPFS } from './services/ipfs.js';
import * as buffer from 'buffer';

const excludedJobs = [
  'Af6vBZSM3eLfJHvfMXKUa3CCeP4b8VEFbBaRhMsJHvtb',
  'DhZJphpRXFVH1sGqYEiiPyeXQr2LEv4FvFnUuCvi3eQF',
  '4vkKcBAs3DuFYK9ZLxzcfmHvwtgaYMJMuv7gnMya8qam',
  'ERgvm546BuSLfHzWegKweGUjecDVtiSui7Pgwnpwo8r3',
  '4pndLabGeRzLtFMdpi34fZCS9u6t9z5jcWT26sf5qbeL',
  'AFPUhb1yaJyhhQ7yyKraTHb4xYgN3zmN6z9oG7qJZ3qe',
];

const jobStateMapping: any = {
  0: 'QUEUED',
  1: 'RUNNING',
  2: 'COMPLETED',
  3: 'STOPPED',
};

const isVersionedTransaction = (
  tx: Transaction | VersionedTransaction,
): tx is VersionedTransaction => {
  return 'version' in tx;
};

/**
 * Method to pause the process
 * @param seconds Number of seconds to pause
 */
const sleep = (seconds: number): Promise<void> =>
  new Promise((res) => setTimeout(res, seconds * 1e3));

/**
 * Method to easily get a universal timestamp
 */
const now = (): number => Math.floor(Date.now() / 1e3);
class KeyWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T> {
    if (isVersionedTransaction(tx)) {
      tx.sign([this.payer]);
    } else {
      tx.partialSign(this.payer);
    }

    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> {
    return txs.map((t) => {
      if (isVersionedTransaction(t)) {
        t.sign([this.payer]);
      } else {
        t.partialSign(this.payer);
      }
      return t;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
  get privateKey(): Uint8Array {
    return this.payer.secretKey;
  }
}

const mapJob = (job: any): Job => {
  job.state = Number.isInteger(job.state)
    ? jobStateMapping[job.state]
    : job.state;
  job.timeStart = job.timeStart ? parseInt(job.timeStart) : job.timeStart;
  job.timeEnd = job.timeEnd ? parseInt(job.timeEnd) : job.timeEnd;
  job.ipfsJob = IPFS.solHashToIpfsHash(job.ipfsJob);
  job.ipfsResult = IPFS.solHashToIpfsHash(job.ipfsResult);

  return job;
};

const polyfill = () => {
  // polyfill buffer for browser
  if (typeof window !== 'undefined') {
    window.Buffer = buffer.Buffer;
  }
};

export { now, sleep, KeyWallet, mapJob, jobStateMapping, excludedJobs };

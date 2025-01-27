// external imports
import { bs58, utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SendTransactionError,
  TransactionInstruction,
  TransactionSignature,
  Connection,
  VersionedTransaction,
  TransactionMessage,
  LAMPORTS_PER_SOL,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

import type { Job, Market, Run } from '../types/index.js';
import { SolanaManager } from './solana.js';
import { IPFS } from '../services/ipfs.js';
import * as anchor from '@coral-xyz/anchor';
import { KeyWallet } from '../utils.js';
// @ts-ignore
const { BN } = anchor.default ? anchor.default : anchor;
import fetch from 'cross-fetch';

// local imports
import { jobStateMapping, mapJob, excludedJobs } from '../utils.js';

const pda = (
  seeds: Array<Buffer | Uint8Array>,
  programId: PublicKey,
): PublicKey => PublicKey.findProgramAddressSync(seeds, programId)[0];

/**
 * Class to interact with the Nosana Jobs Program
 * https://docs.nosana.io/secrets/start.html
 */
export class Jobs extends SolanaManager {
  /**
   * Function to list a Nosana Job in a market
   * @param ipfsHash String of the IPFS hash locating the Nosana Job data.
   */
  async list(ipfsHash: string, jobTimeout: number, market?: PublicKey) {
    await this.loadNosanaJobs();
    await this.setAccounts();
    const jobKey = Keypair.generate();
    const runKey = Keypair.generate();
    try {
      const preInstructions: TransactionInstruction[] = [];
      if (this.config.priority_fee) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        preInstructions.push(addPriorityFee);
      }
      const tx = await this.jobs!.methods.list(
        [...bs58.decode(ipfsHash).subarray(2)],
        new BN(jobTimeout),
      )
        .preInstructions(preInstructions)
        .accounts({
          ...this.accounts,
          job: jobKey.publicKey,
          run: runKey.publicKey,
          market: market ? market : this.accounts?.market,
          vault: market
            ? pda(
                [
                  market.toBuffer(),
                  new PublicKey(this.config.nos_address).toBuffer(),
                ],
                this.jobs!.programId,
              )
            : this.accounts?.vault,
        })
        .signers([jobKey, runKey])
        .rpc();
      return {
        tx,
        job: jobKey.publicKey.toBase58(),
        run: runKey.publicKey.toBase58(),
      };
    } catch (e: any) {
      if (e instanceof SendTransactionError) {
        if (
          e.message.includes(
            'Attempt to debit an account but found no record of a prior credit',
          )
        ) {
          e.message = 'Not enough SOL to make transaction';
          throw e;
        }
      }
      throw e;
    }
  }
  /**
   * Function to delist a Nosana Job in a market
   * @param jobAddress Publickey address of the job to delist.
   */
  async delist(jobAddress: PublicKey | string) {
    if (typeof jobAddress === 'string') jobAddress = new PublicKey(jobAddress);
    await this.loadNosanaJobs();
    await this.setAccounts();

    const jobAccount = await this.jobs!.account.jobAccount.fetch(jobAddress);
    if (jobAccount.state != 0) {
      throw new Error('job cannot be delisted except when in queue');
    }

    const market = await this.getMarket(jobAccount.market);

    const depositAta =
      jobAccount.price > 0
        ? await getAssociatedTokenAddress(
            new PublicKey(this.config.nos_address),
            jobAccount.project,
          )
        : market.vault;

    try {
      const preInstructions: TransactionInstruction[] = [];
      if (this.config.priority_fee) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        preInstructions.push(addPriorityFee);
      }
      const tx = await this.jobs!.methods.delist()
        .preInstructions(preInstructions)
        .accounts({
          ...this.accounts,
          job: jobAddress,
          market: market.address,
          vault: market.vault,
          payer: jobAccount.payer,
          deposit: depositAta,
        })
        .signers([])
        .rpc();
      return {
        tx,
        job: jobAddress.toBase58(),
      };
    } catch (e: any) {
      if (e instanceof SendTransactionError) {
        if (
          e.message.includes(
            'Attempt to debit an account but found no record of a prior credit',
          )
        ) {
          e.message = 'Not enough SOL to make transaction';
          throw e;
        }
      }
      throw e;
    }
  }
  /**
   * Function to extend a running job from chain
   * @param job Publickey address of the job to extend
   */
  async extend(job: PublicKey | string, jobTimeout: number) {
    if (typeof job === 'string') job = new PublicKey(job);
    await this.loadNosanaJobs();
    await this.setAccounts();

    const jobAccount = await this.jobs!.account.jobAccount.fetch(job);
    if (jobAccount.state != 0) {
      throw new Error('job cannot be extended when finished or stopped');
    }

    const market = await this.getMarket(jobAccount.market);

    try {
      const preInstructions: TransactionInstruction[] = [];
      if (this.config.priority_fee) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        preInstructions.push(addPriorityFee);
      }

      const tx = await this.jobs!.methods.extend(new BN(jobTimeout))
        .preInstructions(preInstructions)
        .accounts({
          ...this.accounts,
          job: job,
          market: market.address,
          vault: market.vault,
          user: await getAssociatedTokenAddress(
            new PublicKey(this.config.nos_address),
            this.provider!.wallet.publicKey,
          ),
        })
        .signers([])
        .rpc();

      return {
        tx,
        job: job.toBase58(),
      };
    } catch (e: any) {
      if (e instanceof SendTransactionError) {
        if (
          e.message.includes(
            'Attempt to debit an account but found no record of a prior credit',
          )
        ) {
          e.message = 'Not enough SOL to make transaction';
          throw e;
        }
      }
      throw e;
    }
  }
  /**
   * Function to end a running job from chain
   * @param job Publickey address of the job to end
   */
  async end(job: PublicKey | string) {
    if (typeof job === 'string') job = new PublicKey(job);
    await this.loadNosanaJobs();
    await this.setAccounts();

    const jobAccount = await this.jobs!.account.jobAccount.fetch(job);
    if (jobAccount.state !== 0) {
      throw new Error('job cannot be ended when finished');
    }

    let runAccount;

    try {
      const runs = await this.getRuns(job);

      if (runs.length == 0) {
        throw new Error('job cannot be ended when queued');
      }

      runAccount = runs[0];
    } catch (error: any) {
      if (
        error &&
        error.message &&
        error.message.includes('RPC call or parameters have been disabled')
      ) {
        throw new Error('WARNING: Current RPC cannot check if job is RUNNING');
      } else {
        throw new Error(`WARNING: Could not check if job is RUNNING, ${error}`);
      }
    }

    const market = await this.getMarket(jobAccount.market);

    const depositAta =
      jobAccount.price > 0
        ? await getAssociatedTokenAddress(
            new PublicKey(this.config.nos_address),
            jobAccount.project,
          )
        : market.vault;

    try {
      const preInstructions: TransactionInstruction[] = [];
      if (this.config.priority_fee) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        preInstructions.push(addPriorityFee);
      }

      const tx = await this.jobs!.methods.end()
        .preInstructions(preInstructions)
        .accounts({
          ...this.accounts,
          job: job,
          market: market.address,
          vault: market.vault,
          run: runAccount.publicKey,
          user: await getAssociatedTokenAddress(
            new PublicKey(this.config.nos_address),
            runAccount.account.node,
          ),
          payer: jobAccount.payer,
          deposit: depositAta,
        })
        .signers([])
        .rpc();

      return {
        tx,
        job: job.toBase58(),
      };
    } catch (e: any) {
      if (e instanceof SendTransactionError) {
        if (
          e.message.includes(
            'Attempt to debit an account but found no record of a prior credit',
          )
        ) {
          e.message = 'Not enough SOL to make transaction';
          throw e;
        }
      }
      throw e;
    }
  }
  /**
   * Function to fetch a job from chain
   * @param job Publickey address of the job to fetch
   */
  async get(job: PublicKey | string): Promise<Job> {
    if (typeof job === 'string') job = new PublicKey(job);
    await this.loadNosanaJobs();

    const jobAccount = await this.jobs!.account.jobAccount.fetch(job);
    let runAccount;
    if (jobAccount.state !== 2) {
      try {
        runAccount = (await this.getRuns(job))[0];
        if (runAccount?.account) {
          jobAccount.state = jobStateMapping[1];
          jobAccount.node = runAccount.account.node.toString();
          jobAccount.timeStart = runAccount.account.time;
        }
      } catch (error: any) {
        if (
          error &&
          error.message &&
          error.message.includes('RPC call or parameters have been disabled')
        ) {
          console.error('WARNING: Current RPC cannot check if job is RUNNING');
        } else {
          console.error('WARNING: Could not check if job is RUNNING', error);
        }
      }
    }

    return mapJob(jobAccount as unknown as Job);
  }

  /**
   * Function to fetch multiple jobs from chain
   * @param jobs array with Publickey addresses of the jobs to fetch
   */
  async getMultiple(
    jobs: Array<PublicKey> | Array<string>,
    fetchRunAccounts: boolean = true,
  ) {
    if (typeof jobs[0] === 'string')
      jobs = jobs.map((job) => new PublicKey(job));
    await this.loadNosanaJobs();
    let fetchedJobs = await this.jobs!.account.jobAccount.fetchMultiple(jobs);

    // fetch run account
    if (fetchRunAccounts) {
      for (let i = 0; i < fetchedJobs.length; i++) {
        if (fetchedJobs[i]!.state < 2) {
          try {
            const runAccount = (await this.getRuns(jobs[i]))[0];
            if (runAccount?.account && fetchedJobs[i]) {
              fetchedJobs[i]!.state = jobStateMapping[1];
              fetchedJobs[i]!.node = runAccount.account.node.toString();
              fetchedJobs[i]!.timeStart = runAccount.account.time;
            }
          } catch (error) {
            console.error('error fetching run account', error);
          }
        }
      }
    }
    return fetchedJobs.map((j) => mapJob(j as unknown as Job));
  }

  /**
   * Function to fetch job accounts from chain
   * @param job Publickey address of the job to fetch
   */
  async all(filters?: { [key: string]: any }) {
    await this.loadNosanaJobs();
    const jobAccount = this.jobs!.account.jobAccount;
    const filter: { offset?: number; bytes?: string; dataSize?: number } =
      jobAccount.coder.accounts.memcmp(jobAccount.idlAccount.name, undefined);
    const coderFilters = [];
    if (filter?.offset != undefined && filter?.bytes != undefined) {
      coderFilters.push({
        memcmp: { offset: filter.offset, bytes: filter.bytes },
      });
    }
    if (filter?.dataSize != undefined) {
      coderFilters.push({ dataSize: filter.dataSize });
    }
    if (filters) {
      if (filters.state >= 0) {
        coderFilters.push({
          memcmp: {
            offset: 208,
            bytes: bs58.encode(Buffer.from([filters.state])),
          },
        });
      }
      if (filters.project) {
        coderFilters.push({
          memcmp: {
            offset: 176,
            bytes: filters.project,
          },
        });
      }
      if (filters.node) {
        coderFilters.push({
          memcmp: {
            offset: 104,
            bytes: filters.node,
          },
        });
      }
      if (filters.market) {
        console.log('filter', filters);
        coderFilters.push({
          memcmp: {
            offset: 72,
            bytes: filters.market,
          },
        });
      }
    }

    const accounts = await jobAccount.provider.connection.getProgramAccounts(
      jobAccount.programId,
      {
        dataSlice: { offset: 208, length: 17 }, // Fetch timeStart only.
        filters: [...coderFilters],
      },
    );
    const filterExcludedJobs = accounts.filter(({ pubkey, account }) => {
      if (excludedJobs.includes(pubkey.toString())) return false;
      return true;
    });
    const accountsWithTimeStart = filterExcludedJobs.map(
      ({ pubkey, account }) => ({
        pubkey,
        state: account.data[0],
        timeStart: parseFloat(new BN(account.data.slice(9), 'le')),
        timeEnd: parseFloat(new BN(account.data.slice(1, 9), 'le')),
      }),
    );

    // sort by desc timeStart & put 0 on top
    const sortedAccounts = accountsWithTimeStart.sort((a, b) => {
      if (a.state === b.state) {
        if (a.timeStart === b.timeStart) {
          return a.pubkey.toString().localeCompare(b.pubkey.toString());
        }
        if (a.timeStart === 0) return -1;
        if (b.timeStart === 0) return 1;
        return b.timeStart - a.timeStart;
      }
      return a.state - b.state;
    });

    return sortedAccounts;
  }

  /**
   * Function to fetch ALL job accounts from chain
   * NOTE: should only be used to make an export of all jobs
   */
  async allFullJobs() {
    await this.loadNosanaJobs();
    const accounts = await this.jobs!.account.jobAccount.all();
    console.log('accounts', accounts);
    // @ts-ignore
    const filterExcludedJobs = accounts.filter(({ publicKey, account }) => {
      // @ts-ignore
      if (
        excludedJobs.includes(publicKey.toString()) ||
        account.state === 0 ||
        account.state === 1
      )
        return false;
      return true;
    });
    const accountsWithTimeStart = await Promise.all(
      filterExcludedJobs.map(async (job) => ({
        pubkey: job.publicKey,
        ipfsJob: await IPFS.solHashToIpfsHash(job.account.ipfsJob),
        ipfsResult: await IPFS.solHashToIpfsHash(job.account.ipfsResult),
        market: job.account.market,
        node: job.account.node,
        payer: job.account.payer,
        price: job.account.price,
        project: job.account.project,
        state: job.account.state,
        timeEnd: job.account.timeEnd
          ? parseInt(job.account.timeEnd)
          : job.account.timeEnd,
        timeStart: job.account.timeStart
          ? parseInt(job.account.timeStart)
          : job.account.timeStart,
      })),
    );

    // sort by desc timeStart & put 0 on top
    const sortedAccounts = accountsWithTimeStart.sort((a, b) => {
      if (a.state === b.state) {
        if (a.timeStart === b.timeStart) {
          return a.pubkey.toString().localeCompare(b.pubkey.toString());
        }
        if (a.timeStart === 0) return -1;
        if (b.timeStart === 0) return 1;
        return b.timeStart - a.timeStart;
      }
      return a.state - b.state;
    });

    return sortedAccounts;
  }

  /**
   * Function to clean a job from chain
   * @param job Publickey address of the job to fetch
   */
  async cleanAdmin(
    jobAddress: PublicKey | string,
    instructionOnly?: boolean,
  ): Promise<TransactionSignature | TransactionInstruction> {
    if (typeof jobAddress === 'string') jobAddress = new PublicKey(jobAddress);
    await this.loadNosanaJobs();
    await this.setAccounts();
    const job = await this.jobs!.account.jobAccount.fetch(jobAddress);

    const accounts = {
      authority: this.accounts!.authority,
      payer: job.payer,
      job: jobAddress,
    };
    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee && !instructionOnly) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }
    const tx = this.jobs!.methods.cleanAdmin()
      .preInstructions(preInstructions)
      .accounts(accounts);
    if (instructionOnly) {
      return await tx.instruction();
    } else {
      return await tx.rpc();
    }
  }

  /**
   * Function to fetch a run from chain
   * @param run Publickey address of the run to fetch
   */
  async getRun(run: PublicKey | string): Promise<Run> {
    if (typeof run === 'string') run = new PublicKey(run);
    await this.loadNosanaJobs();
    return {
      publicKey: run,
      account: await this.jobs!.account.runAccount.fetch(run),
    };
  }
  /**
   * Function to fetch a run of a job from chain
   * @param job Publickey address of the job to fetch
   */
  async getRuns(filter: PublicKey | string | Array<any>): Promise<Array<any>> {
    if (typeof filter === 'string') filter = new PublicKey(filter);
    await this.loadNosanaJobs();
    const runAccounts = await this.jobs!.account.runAccount.all(
      Array.isArray(filter)
        ? filter
        : [{ memcmp: { offset: 8, bytes: filter.toString() } }],
    );
    return runAccounts;
  }

  /**
   * Get all Runs
   * @returns
   */
  async getActiveRuns(): Promise<Array<any>> {
    await this.loadNosanaJobs();
    const runAccounts = await this.jobs!.account.runAccount.all();
    return runAccounts;
  }

  /**
   * Function to fetch a market from chain
   * @param market Publickey address of the market to fetch
   */
  async getMarket(market: PublicKey | string): Promise<Market> {
    if (typeof market === 'string') market = new PublicKey(market);
    await this.loadNosanaJobs();
    const marketAccount = await this.jobs!.account.marketAccount.fetch(
      market.toString(),
    );
    //@ts-ignore
    return { ...marketAccount, address: market };
  }

  async updateMarket(
    market: PublicKey | string,
    updatedData: {
      nodeAccessKey?: string;
      jobExpiration?: typeof BN;
      jobType?: number;
      jobPrice?: typeof BN;
      nodeStakeMinimum?: typeof BN;
    },
    instructionOnly?: boolean,
  ): Promise<string | TransactionInstruction> {
    if (typeof market === 'string') market = new PublicKey(market);
    await this.loadNosanaJobs();
    const marketAccount = await this.jobs!.account.marketAccount.fetch(
      market.toString(),
    );
    const data = {
      jobExpiration: updatedData.jobExpiration
        ? new BN(updatedData.jobExpiration)
        : new BN(marketAccount.jobExpiration),
      jobPrice: updatedData.jobPrice
        ? new BN(updatedData.jobPrice)
        : new BN(marketAccount.jobPrice),
      jobType: updatedData.jobType
        ? new BN(updatedData.jobType)
        : marketAccount.jobType,
      nodeStakeMinimum: updatedData.nodeStakeMinimum
        ? new BN(updatedData.nodeStakeMinimum)
        : new BN(marketAccount.nodeXnosMinimum),
    };

    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee && !instructionOnly) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }

    const tx = await this.jobs!.methods.update(
      // @ts-ignore
      data.jobExpiration,
      data.jobPrice,
      data.jobType,
      data.nodeStakeMinimum,
      new BN(7200), // TODO: make timeout a parameter
    )
      .preInstructions(preInstructions)
      .accounts({
        market: market,
        accessKey:
          updatedData && updatedData.nodeAccessKey
            ? updatedData.nodeAccessKey
            : marketAccount.nodeAccessKey,
        authority: this.provider!.wallet.publicKey,
      });

    if (instructionOnly) {
      return await tx.instruction();
    } else {
      return await tx.rpc();
    }
  }

  async createMarket(data: {
    nodeAccessKey?: PublicKey;
    jobExpiration?: typeof BN;
    jobType?: number;
    jobPrice?: typeof BN;
    jobTimeout?: typeof BN;
    nodeStakeMinimum: typeof BN;
  }): Promise<{
    transaction: string;
    market: string;
  }> {
    await this.loadNosanaJobs();
    await this.setAccounts();

    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }
    const mintAccount = new PublicKey(this.config.nos_address);
    const marketKeypair = Keypair.generate();
    const tx = await this.jobs!.methods.open(
      // @ts-ignore
      data.jobExpiration,
      data.jobPrice,
      data.jobTimeout,
      data.jobType,
      data.nodeStakeMinimum,
    )
      .preInstructions(preInstructions)
      .accounts({
        ...this.accounts,
        mint: mintAccount,
        market: marketKeypair.publicKey,
        accessKey: data.nodeAccessKey,
        vault: pda(
          [
            marketKeypair.publicKey.toBuffer(),
            new PublicKey(this.config.nos_address).toBuffer(),
          ],
          this.jobs!.programId,
        ),
      })
      .signers([marketKeypair])
      .rpc();
    return {
      transaction: tx,
      market: marketKeypair.publicKey.toString(),
    };
  }

  /**
   * Function to fetch all markets
   */
  async allMarkets(): Promise<Array<any>> {
    await this.loadNosanaJobs();
    const marketAccounts = await this.jobs!.account.marketAccount.all();
    return marketAccounts.map((m: any) => {
      m.account.address = m.publicKey;
      return m.account as Market;
    });
  }

  /**
   * Function to queue a Node or work on a job
   * @returns
   */
  async work(market: string | PublicKey, nft?: PublicKey) {
    try {
      await this.loadNosanaJobs();
      await this.setAccounts();
      if (typeof market === 'string') market = new PublicKey(market);
      const runKey = Keypair.generate();
      let nftAta: PublicKey, metadata: PublicKey;
      if (!nft) {
        nftAta = await getAssociatedTokenAddress(
          new PublicKey(this.config.nos_address),
          this.provider!.wallet.publicKey,
        );
        metadata = new PublicKey('11111111111111111111111111111111');
      } else {
        nftAta = await getAssociatedTokenAddress(
          nft,
          this.provider!.wallet.publicKey,
        );
        metadata = this.getMetadataPDA(nft);
      }
      const accounts = {
        ...this.accounts,
        stake: pda(
          [
            utf8.encode('stake'),
            new PublicKey(this.config.nos_address).toBuffer(),
            this.provider!.wallet.publicKey.toBuffer(),
          ],
          new PublicKey(this.config.stake_address),
        ),
        run: runKey.publicKey,
        nft: nftAta,
        metadata,
        feePayer: this.provider!.wallet.publicKey,
        market,
      };
      const preInstructions: TransactionInstruction[] = [];
      if (this.config.priority_fee) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        preInstructions.push(addPriorityFee);
      }
      const tx = await this.jobs!.methods.work()
        .preInstructions(preInstructions)
        .accounts(accounts)
        .signers([runKey])
        .rpc();
      return tx;
    } catch (e) {
      if (e instanceof SendTransactionError) {
        if (
          e.message.includes(
            'Attempt to debit an account but found no record of a prior credit',
          )
        ) {
          e.message = 'Not enough SOL to make transaction';
          throw e;
        }
      }
      throw e;
    }
  }

  /**
   * Function to submit a result
   * @param result Uint8Array of result
   * @param run Run account of job
   * @param run Market account of job
   * @returns transaction
   */
  async submitResult(
    result: Array<any>,
    run: Run | string | PublicKey,
    market: Market | string | PublicKey,
  ) {
    await this.loadNosanaJobs();
    await this.setAccounts();

    if (typeof market === 'string') market = new PublicKey(market);
    let marketAddress;
    if (market instanceof PublicKey) {
      marketAddress = market;
      market = await this.getMarket(market);
    }

    if (typeof run === 'string') run = new PublicKey(run);
    if (run instanceof PublicKey) {
      run = (await this.getRun(run)) as Run;
    }

    const job: Job = await this.get(run.account.job);
    const depositAta =
      job.price > 0
        ? await getAssociatedTokenAddress(
            new PublicKey(this.config.nos_address),
            job.project,
          )
        : market.vault;
    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }
    const tx = await this.jobs!.methods.finish(result)
      .preInstructions(preInstructions)
      .accounts({
        ...this.accounts,
        job: run.account.job,
        run: run.publicKey,
        vault: market.vault,
        user: await getAssociatedTokenAddress(
          new PublicKey(this.config.nos_address),
          this.provider!.wallet.publicKey,
        ),
        payer: run.account.payer,
        // @ts-ignore
        deposit: depositAta,
        project: job.project,
        market: marketAddress ? marketAddress : market.address,
      })
      .rpc();
    return tx;
  }

  /**
   * Function to quit a job
   * @param run Run account of the job
   * @returns
   */
  async quit(run: Run | string | PublicKey) {
    await this.loadNosanaJobs();
    await this.setAccounts();
    if (typeof run === 'string') run = new PublicKey(run);
    if (run instanceof PublicKey) {
      run = (await this.getRun(run)) as Run;
    }
    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }
    const tx = await this.jobs!.methods.quit()
      .preInstructions(preInstructions)
      .accounts({
        ...this.accounts,
        job: run.account.job,
        run: run.publicKey,
        payer: run.account.payer,
      })
      .rpc();
    return tx;
  }

  /**
   * Exit the node queue
   * @returns
   */
  async stop(market: string | PublicKey) {
    await this.loadNosanaJobs();
    await this.setAccounts();
    if (typeof market === 'string') market = new PublicKey(market);
    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }
    const tx = await this.jobs!.methods.stop()
      .preInstructions(preInstructions)
      .accounts({
        ...this.accounts,
        market,
      })
      .rpc();
    return tx;
  }

  /**
   * A version of "list" that returns just the instructions + signers,
   * allowing you to combine them with other instructions (e.g. swap) in one transaction.
   */
  async listInstruction(
    ipfsHash: string,
    jobTimeout: number,
    market?: PublicKey,
    skipPriorityFee?: boolean,
  ): Promise<{ instructions: TransactionInstruction[]; signers: Keypair[] }> {
    await this.loadNosanaJobs();
    await this.setAccounts();

    const jobKey = Keypair.generate();
    const runKey = Keypair.generate();

    const preInstructions: TransactionInstruction[] = [];
    if (this.config.priority_fee && !skipPriorityFee) {
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.config.priority_fee,
      });
      preInstructions.push(addPriorityFee);
    }

    const vault = market
      ? pda([market.toBuffer(), new PublicKey(this.config.nos_address).toBuffer()], this.jobs!.programId)
      : this.accounts?.vault;

    const methodBuilder = this.jobs!.methods
      .list([...bs58.decode(ipfsHash).subarray(2)], new BN(jobTimeout))
      .preInstructions(preInstructions)
      .accounts({
        ...this.accounts,
        job: jobKey.publicKey,
        run: runKey.publicKey,
        market: market ? market : this.accounts?.market,
        vault,
      })
      .signers([jobKey, runKey]);

    const listIx = await methodBuilder.instruction();
    const instructions = [...preInstructions, listIx];

    return {
      instructions,
      signers: [jobKey, runKey],
    };
  }

  /**
   * Helper method to get Jupiter swap instructions when NOS balance is insufficient
   */
  private async getJupiterSwapInstructions(nosNeeded: number): Promise<{
    instructions: TransactionInstruction[];
    lookupTables: string[];
  }> {
    // Get Jupiter quote
    const priceCheckUrl = new URL('https://quote-api.jup.ag/v6/quote');
    priceCheckUrl.searchParams.append('inputMint', 'So11111111111111111111111111111111111111112');
    priceCheckUrl.searchParams.append('outputMint', this.config.nos_address);
    priceCheckUrl.searchParams.append('swapMode', 'ExactOut');
    priceCheckUrl.searchParams.append('amount', Math.ceil(nosNeeded).toString());
    priceCheckUrl.searchParams.append('slippageBps', '1000');

    const priceRes = await fetch(priceCheckUrl.toString());
    if (!priceRes.ok) {
      throw new Error(`Jupiter price check failed: ${await priceRes.text()}`);
    }
    const priceQuote = await priceRes.json();
    const solNeeded = Number(priceQuote.inAmount) / LAMPORTS_PER_SOL;

    // Get Jupiter swap instructions
    const estimatedSolNeeded = Math.ceil(solNeeded * 1.3 * LAMPORTS_PER_SOL);
    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.append('inputMint', 'So11111111111111111111111111111111111111112');
    quoteUrl.searchParams.append('outputMint', this.config.nos_address);
    quoteUrl.searchParams.append('swapMode', 'ExactIn');
    quoteUrl.searchParams.append('amount', estimatedSolNeeded.toString());
    quoteUrl.searchParams.append('maxAccounts', '8');
    quoteUrl.searchParams.append('slippageBps', '1000');

    const quoteRes = await fetch(quoteUrl.toString());
    if (!quoteRes.ok) {
      throw new Error(`Jupiter quote failed: ${await quoteRes.text()}`);
    }
    const quoteResponse = await quoteRes.json();

    // Get swap instructions from Jupiter
    const swapParams = {
      userPublicKey: this.provider!.wallet.publicKey.toString(),
      quoteResponse,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: false,
      asLegacyTransaction: false,
      computeUnitPriceMicroLamports: 5000000,
    };

    const swapInstructionsResponse = await fetch(
      'https://quote-api.jup.ag/v6/swap-instructions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapParams),
      },
    );

    if (!swapInstructionsResponse.ok) {
      throw new Error(
        `Failed to fetch Jupiter swap-instructions: ${await swapInstructionsResponse.text()}`,
      );
    }

    const swapInstructions = await swapInstructionsResponse.json();
    if (swapInstructions.error) {
      throw new Error(`Jupiter swap instructions error: ${swapInstructions.error}`);
    }

    // Parse Jupiter instructions
    const {
      tokenLedgerInstruction,
      setupInstructions = [],
      swapInstruction,
      cleanupInstruction,
      addressLookupTableAddresses = [],
    } = swapInstructions;

    let jupiterInstructions: TransactionInstruction[] = [];
    if (setupInstructions?.length) {
      jupiterInstructions.push(...setupInstructions.map(parseInstruction));
    }
    if (tokenLedgerInstruction) {
      jupiterInstructions.push(parseInstruction(tokenLedgerInstruction));
    }
    if (swapInstruction) {
      jupiterInstructions.push(parseInstruction(swapInstruction));
    }
    if (cleanupInstruction) {
      jupiterInstructions.push(parseInstruction(cleanupInstruction));
    }

    return {
      instructions: jupiterInstructions,
      lookupTables: addressLookupTableAddresses,
    };
  }

  /**
   * Method to list a Nosana Job in a single transaction, ensuring you have enough NOS tokens.
   * If your balance is insufficient, it will first swap SOL to NOS using Jupiter, then list the job.
   */
  public async ensureNosAndListJob(
    ipfsHash: string,
    jobTimeout: number,
    market?: PublicKey,
  ): Promise<string> {
    // 1) Gather data first (load programs, get accounts, fetch Jupiter quotes, etc.)
    await this.loadNosanaJobs();
    await this.setAccounts();

    // Check NOS balance and get required amount
    const marketInfo = await this.getMarket(market || this.accounts!.market);
    const requiredNosAmount = Number(marketInfo.jobPrice) * jobTimeout;
    const nosBalance = await this.getNosBalance();
    const currentAmount = nosBalance?.uiAmount ?? 0;

    // If we have enough NOS, just list the job
    if (currentAmount >= requiredNosAmount) {
      const { tx } = await this.list(ipfsHash, jobTimeout, market);
      return tx;
    }

    // Get Jupiter swap instructions if we need more NOS
    const nosNeeded = requiredNosAmount - currentAmount;
    const { instructions: jupiterInstructions, lookupTables } = 
      await this.getJupiterSwapInstructions(nosNeeded);

    // Get Nosana list instructions (skipPriorityFee = true since Jupiter handles it)
    const { instructions: listIxs, signers: jobSigners } = 
      await this.listInstruction(ipfsHash, jobTimeout, market, true);

    // 2) Consolidate all instructions in-memory
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 50000000,
    });
    console.log('computeBudgetIx', computeBudgetIx);
    const allInstructions = [computeBudgetIx, ...jupiterInstructions, ...listIxs];

    // 3) Get fresh blockhash right before building transaction
    const latestBlockhash = await this.connection!.getLatestBlockhash({
      commitment: 'processed',
    });

    // 4) Build transaction with fresh blockhash
    const lookupTableResults = await Promise.all(
      lookupTables.map((addr) => 
        this.connection!.getAddressLookupTable(new PublicKey(addr))
      ),
    );
    const validLookupTables = lookupTableResults
      .map((res) => res.value)
      .filter(Boolean) as AddressLookupTableAccount[];

    const messageV0 = new TransactionMessage({
      payerKey: this.provider!.wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: allInstructions,
    }).compileToV0Message(validLookupTables);

    const versionedTx = new VersionedTransaction(messageV0);

    // 5) Sign with ephemeral keypairs first
    versionedTx.sign(jobSigners);

    // 6) Let wallet sign the transaction last
    const fullySignedTx = await this.provider!.wallet.signTransaction(versionedTx);

    // 7) Immediately send the transaction
    const txid = await this.connection!.sendTransaction(fullySignedTx, {
      skipPreflight: false,
      maxRetries: 5,
    });

    // 8) Confirm transaction using blockhash + lastValidBlockHeight
    const confirmation = await this.connection!.confirmTransaction(
      {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: txid,
      },
      'processed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    console.log('Transaction sent successfully:', txid);
    return txid;
  }
}

/**
 * Helper function to parse Jupiter's instruction format into a TransactionInstruction
 */
function parseInstruction(raw: any): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: Buffer.from(raw.data, 'base64'),
  });
}

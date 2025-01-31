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
      

      const priorityFee = await this.getPriorityFee();
      if (priorityFee > 0) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
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
      const priorityFee = await this.getPriorityFee();
      if (priorityFee > 0) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
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
      const priorityFee = await this.getPriorityFee();
      if (priorityFee > 0) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
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
   * @param market Market account of job
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
   * Swap SOL for NOS using Jupiter's Swap API (in a separate transaction).
   * @param nosNeeded The amount of NOS (in whole tokens) to acquire.
   * @returns The transaction signature for the swap.
   */
  public async swapSolToNos(nosNeeded: number): Promise<string> {
    // Use your own logic if you need decimals. For example, if NOS has 6 decimals:
    // e.g. if user wants 10 NOS and NOS has 6 decimals => 10_000_000
    const nosAmountRaw = Math.ceil(nosNeeded * 1_000_000); // adjust for your token decimals

    // 1) GET QUOTE from Jupiter
    // We'll do an ExactOut approach so we pass the output amount
    // and ask Jupiter for how many SOL we need.
    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.append('inputMint', 'So11111111111111111111111111111111111111112'); // SOL
    quoteUrl.searchParams.append('outputMint', this.config.nos_address); // NOS
    quoteUrl.searchParams.append('swapMode', 'ExactOut');
    quoteUrl.searchParams.append('amount', nosAmountRaw.toString());
    // 50 bps = 0.5% slippage
    quoteUrl.searchParams.append('slippageBps', '50');

    const quoteResponse = await (await fetch(quoteUrl.toString())).json();
    
    // Check if there's an error in the response
    if (quoteResponse.error) {
      throw new Error(`Jupiter quote error: ${quoteResponse.error}`);
    }

    // 2) GET SERIALIZED SWAP TRANSACTION from Jupiter
    const swapBody = {
      quoteResponse,  // Use the entire response as Jupiter expects
      userPublicKey: this.provider!.wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true, // allow dynamic compute limit
      computeUnitPriceMicroLamports: this.config.priority_fee
    };

    const swapTxResponse = await (
      await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapBody),
      })
    ).json();

    if (swapTxResponse.error) {
      throw new Error(`Jupiter swap error: ${swapTxResponse.error}`);
    }
    const { swapTransaction, lastValidBlockHeight, blockhash } = swapTxResponse;
    if (!swapTransaction) {
      throw new Error(`No swapTransaction returned by Jupiter: ${JSON.stringify(swapTxResponse)}`);
    }

    // 3) DESERIALIZE, SIGN & SEND
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    // Anchor's wallet signs the transaction:
    const signedTx = await this.provider!.wallet.signTransaction(transaction);

    // 4) SEND THE TRANSACTION
    const txid = await this.connection!.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      maxRetries: 5,
    });

    // 5) CONFIRM
    await this.connection!.confirmTransaction(
      {
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature: txid,
      },
      'processed',
    );

    return txid;
  }

  /**
   * Method to list a Nosana Job, ensuring you have enough NOS tokens.
   * If your balance is insufficient, it will first perform a swap (in a separate transaction),
   * then list the job in a second transaction.
   * @param ipfsHash String of the IPFS hash locating the Nosana Job data
   * @param jobTimeout Number of seconds the job should run
   * @param market Optional market PublicKey to list the job in
   * @param maxRetries Optional number of retries for the swap (defaults to 3)
   */
  public async ensureNosAndListJob(
    ipfsHash: string,
    jobTimeout: number,
    market?: PublicKey
  ): Promise<{ tx: string; job: string; run: string }> {
    await this.loadNosanaJobs();
    await this.setAccounts();

    const marketInfo = await this.getMarket(market || this.accounts!.market);

    // Calculate how many NOS we need
    // (note you may want to tweak these multipliers if your fee or buffer estimates change frequently)
    const baseAmount = (Number(marketInfo.jobPrice) * jobTimeout) / 1_000_000;
    const withNetworkFee = baseAmount * 1.1;
    const requiredNosAmount = withNetworkFee * 1.1; // Slight buffer to account for price fluctuations

    // Check current NOS balance
    const nosBalance = await this.getNosBalance();
    const currentAmount = nosBalance?.uiAmount ?? 0;

    // If not enough NOS, swap
    if (currentAmount < requiredNosAmount) {
      const nosShortage = requiredNosAmount - currentAmount;
      console.log(
        `Insufficient NOS (${currentAmount} < ${requiredNosAmount}). Swapping ~${nosShortage.toFixed(
          2
        )} NOS worth of SOL...`
      );

      // Perform the swap
      await this.swapSolToNos(nosShortage);

      // Wait a moment so that the new balance is registered on-chain (prevent race conditions)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if the new balance is sufficient now
      const newBalance = await this.getNosBalance();
      if ((newBalance?.uiAmount ?? 0) < requiredNosAmount) {
        throw new Error(
          'Swap completed but balance is still insufficient. Try again or check token decimals.'
        );
      }
    }

    // Now we have enough NOS, list the job
    return await this.list(ipfsHash, jobTimeout, market);
  }
}

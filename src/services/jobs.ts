// external imports
import * as anchor from '@coral-xyz/anchor';
import { bs58, utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';
import {
  Keypair,
  PublicKey,
  SendTransactionError,
  Signer,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

import type { Job, Market, Run } from '../types/index.js';
import { SolanaManager } from './solana.js';
import { IPFS } from '../services/ipfs.js';
// @ts-ignore
const { BN } = anchor.default ? anchor.default : anchor;

// local imports
import { jobStateMapping, mapJob, excludedJobs, KeyWallet } from '../utils.js';

const emptyResults =
  '0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0';

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
  async list(
    ipfsHash: string,
    jobTimeout: number,
    market: string | PublicKey,
    node?: string | PublicKey,
    instructionOnly?: boolean,
    project?: Keypair,
    payer?: PublicKey,
  ) {
    if (typeof market === 'string') market = new PublicKey(market);

    await this.loadNosanaJobs();
    await this.setAccounts();
    const mint = new PublicKey(this.config.nos_address);
    if (!payer) {
      payer = this.accounts!.payer;
    }
    const jobKey = Keypair.generate();
    const runKey = Keypair.generate();

    try {
      const accounts = {
        ...this.accounts,
        job: jobKey.publicKey,
        run: runKey.publicKey,
        user: await getAssociatedTokenAddress(mint, payer),
        payer: payer,
        market: market,
        authority: project?.publicKey || this.provider!.wallet.publicKey,
        vault: pda(
          [
            market.toBuffer(),
            mint.toBuffer(),
          ],
          this.jobs!.programId,
        ),
      };

      if (node) {
        if (typeof node === 'string') node = new PublicKey(node);
        const tx = await this.jobs!.methods.assign(
          [...bs58.decode(ipfsHash).subarray(2)],
          new BN(jobTimeout),
        )
          .accounts({ ...accounts, node })
          .signers([jobKey, runKey])
          .rpc();

        return {
          tx,
          job: jobKey.publicKey.toBase58(),
          run: runKey.publicKey.toBase58(),
        };
      }
      const tx = await this.jobs!.methods.list(
        [...bs58.decode(ipfsHash).subarray(2)],
        new BN(jobTimeout),
      )
        .accounts(accounts)
        .signers(project ? [jobKey, runKey, project] : [jobKey, runKey]);

      if (instructionOnly) {
        return await tx.instruction();
      } else {
        return {
          tx: await tx.rpc(),
          job: jobKey.publicKey.toBase58(),
          run: runKey.publicKey.toBase58(),
        };
      }
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
  async delist(jobAddress: PublicKey | string, instructionOnly?: boolean) {
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
          jobAccount.payer,
        )
        : market.vault;

    try {
      const tx = await this.jobs!.methods.delist()
        .accounts({
          ...this.accounts,
          job: jobAddress,
          market: market.address,
          vault: market.vault,
          payer: jobAccount.payer,
          deposit: depositAta,
        })
        .signers([]);
      if (instructionOnly) {
        return await tx.instruction();
      } else {
        return {
          tx: await tx.rpc(),
          job: jobAddress.toBase58(),
        };
      }
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
   * @param jobTimeout Time in seconds to extend the job
   */
  async extend(
    job: PublicKey | string,
    jobTimeout: number,
    instructionOnly?: boolean,
  ) {
    if (typeof job === 'string') job = new PublicKey(job);
    await this.loadNosanaJobs();
    await this.setAccounts();

    const jobAccount = await this.jobs!.account.jobAccount.fetch(job);
    if (jobAccount.state != 0) {
      throw new Error('job cannot be extended when finished or stopped');
    }

    const market = await this.getMarket(jobAccount.market);

    // Add the current timeout to the extend time to make it feel like we're adding time
    // The unit of account for the timeout is in seconds
    const newTimeout = new BN(jobAccount.timeout || 0).add(new BN(jobTimeout));

    try {
      // The timeout passed to the extend function always expects the time to be in seconds and to be larger than the current timeOut.
      const tx = await this.jobs!.methods.extend(newTimeout)
        .accounts({
          ...this.accounts,
          job: job,
          market: market.address,
          vault: market.vault,
          payer: jobAccount.payer,
          user: await getAssociatedTokenAddress(
            new PublicKey(this.config.nos_address),
            jobAccount.payer,
          ),
        })
        .signers([]);

      if (instructionOnly) {
        return await tx.instruction();
      } else {
        return {
          tx: await tx.rpc(),
          job: job.toBase58(),
        };
      }
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
  async end(job: PublicKey | string, instructionOnly?: boolean) {
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
    const preInstructions: TransactionInstruction[] = [];

    const depositAta =
      jobAccount.price > 0
        ? await this.getNosATA(jobAccount.payer)
        : market.vault;

    // check if node ATA already exists, if not create it
    const nodeAta = await this.getNosATA(runAccount.account.node);
    try {
      await getAccount(this.connection!, nodeAta);
    } catch (error) {
      try {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            (this.provider?.wallet as KeyWallet).payer.publicKey,
            nodeAta,
            new PublicKey(runAccount.account.node),
            new PublicKey(this.config.nos_address),
          ),
        );
      } catch (e) { }
    }

    try {
      const methodBuilder = this.jobs!.methods.end()
        .accounts({
          ...this.accounts,
          job: job,
          market: market.address,
          vault: market.vault,
          run: runAccount.publicKey,
          user: nodeAta,
          payer: runAccount.account.payer,
          deposit: depositAta,
        })
        .signers([]);

      if (instructionOnly) {
        return [...preInstructions, await methodBuilder.instruction()];
      }

      return {
        tx: await methodBuilder.preInstructions(preInstructions).rpc(),
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
    const tx = this.jobs!.methods.cleanAdmin().accounts(accounts);
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

    const tx = await this.jobs!.methods.update(
      // @ts-ignore
      data.jobExpiration,
      data.jobPrice,
      data.jobType,
      data.nodeStakeMinimum,
      new BN(7200), // TODO: make timeout a parameter
    ).accounts({
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
      const tx = await this.jobs!.methods.work()
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
          job.payer,
        )
        : market.vault;

    const preInstructions: TransactionInstruction[] = [];

    // check if node ATA already exists, if not create it
    const nodeAta = await this.getNosATA(this.provider!.wallet.publicKey);
    try {
      await getAccount(this.connection!, nodeAta);
    } catch (error) {
      try {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            (this.provider?.wallet as KeyWallet).payer.publicKey,
            nodeAta,
            this.provider!.wallet.publicKey,
            new PublicKey(this.config.nos_address),
          ),
        );
      } catch (e) { }
    }

    const tx = await this.jobs!.methods.finish(result)
      .accounts({
        ...this.accounts,
        job: run.account.job,
        run: run.publicKey,
        vault: market.vault,
        user: nodeAta,
        payerJob: job.payer,
        payerRun: run.account.payer,
        // @ts-ignore
        deposit: depositAta,
        market: marketAddress ? marketAddress : market.address,
      })
      .preInstructions(preInstructions)
      .rpc();
    return tx;
  }

  async complete(results: Array<any>, job: PublicKey | string) {
    if (typeof job === 'string') job = new PublicKey(job);

    await this.loadNosanaJobs();
    await this.setAccounts();

    const jobAccount = await this.jobs!.account.jobAccount.fetch(job);

    if (jobAccount.state !== 2) {
      throw new Error('Cannot complete a job that has not been stopped.');
    }

    if (jobAccount.ipfsResult.toString() !== emptyResults) {
      throw new Error('Job has already been completed.');
    }

    try {
      const tx = await this.jobs!.methods.complete(results)
        .accounts({ job, authority: this.provider!.wallet.publicKey })
        .rpc();

      return {
        tx,
        job,
      };
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
    const tx = await this.jobs!.methods.quit()
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
  async stop(market: string | PublicKey, node?: string | PublicKey) {
    await this.loadNosanaJobs();
    await this.setAccounts();
    if (typeof market === 'string') market = new PublicKey(market);
    if (typeof node === 'string') node = new PublicKey(node);
    const tx = await this.jobs!.methods.stop()
      .accounts({
        ...this.accounts,
        market,
        node: node || this.wallet.publicKey,
      })
      .rpc();
    return tx;
  }
}

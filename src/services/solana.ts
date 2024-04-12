import { AnchorProvider, Idl, Program, setProvider } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
  Connection,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import type { Cluster, ParsedAccountData, TokenAmount } from '@solana/web3.js';
import { associatedAddress } from '@coral-xyz/anchor/dist/cjs/utils/token.js';
import { bs58, utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';

import type {
  NosanaJobs,
  SolanaConfig,
  NosanaNodes,
  NosanaStake,
} from '../types/index.js';
import { KeyWallet, getWallet, pda } from '../utils.js';
import { solanaConfigPreset } from '../config.js';
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider.js';

/**
 * Class to interact with Nosana Programs on the Solana Blockchain,
 * with the use of Anchor.
 */
export class SolanaManager {
  provider: AnchorProvider | undefined;
  jobs: Program<NosanaJobs> | undefined;
  nodes: Program<NosanaNodes> | undefined;
  stake:
    | {
        program: Program<NosanaStake> | null;
        poolsProgram: any;
        rewardsProgram: any;
      }
    | undefined = {
    program: null,
    poolsProgram: null,
    rewardsProgram: null,
  };
  accounts: { [key: string]: PublicKey } | undefined;
  stakeAccounts: { [key: string]: any } | undefined;
  poolAccounts: { [key: string]: any } | undefined;
  config: SolanaConfig;
  wallet: Wallet;
  connection: Connection | undefined;
  constructor(
    environment: string = 'devnet',
    wallet: Wallet | string | Keypair | Iterable<number>,
    config?: Partial<SolanaConfig>,
  ) {
    this.config = solanaConfigPreset[environment];
    Object.assign(this.config, config);

    this.wallet = getWallet(wallet);

    if (typeof process !== 'undefined' && process.env?.ANCHOR_PROVIDER_URL) {
      // TODO: figure out if we want to support this or not
      this.provider = AnchorProvider.env();
    } else {
      let node = this.config.network;
      if (!this.config.network.includes('http')) {
        node = clusterApiUrl(this.config.network as Cluster);
      }
      this.connection = new Connection(node, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });
      this.provider = new AnchorProvider(this.connection, this.wallet, {});
    }
    setProvider(this.provider);
  }

  async requestAirdrop(
    amount = 1e9,
    publicKey?: PublicKey,
  ): Promise<string | boolean> {
    try {
      if (this.connection) {
        let txhash = await this.connection.requestAirdrop(
          publicKey ? publicKey : this.wallet.publicKey,
          amount,
        );
        return txhash;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  /**
   * Fetches latest NOS price from coingecko
   * @returns NOS Price in BTC, ETH and USD
   */
  async getNosPrice() {
    let result = await fetch(
      'https://api.coingecko.com/api/v3/coins/nosana/tickers',
    );
    const data = await result.json();
    if (data && data.tickers) {
      return data.tickers[0].converted_last;
    } else {
      return null;
    }
  }

  /**
   * Get NOS Balance of an address
   * @param address
   * @returns
   */
  async getNosBalance(
    address?: string | PublicKey,
  ): Promise<TokenAmount | undefined> {
    if (!address) {
      address = this.provider?.wallet.publicKey;
    }
    if (typeof address === 'string') address = new PublicKey(address);
    const mintAccount = new PublicKey(this.config.nos_address);
    const account = await this.connection!.getTokenAccountsByOwner(address!, {
      mint: mintAccount,
    });
    if (!account.value[0]) return;
    const tokenAddress = new PublicKey(account.value[0].pubkey.toString());
    const tokenBalance = await this.connection!.getTokenAccountBalance(
      tokenAddress,
    );
    return tokenBalance.value;
  }

  /**
   * Get SOL balance of an address
   * @param address
   * @returns
   */
  async getSolBalance(address?: string | PublicKey): Promise<number> {
    if (!address) {
      address = this.provider?.wallet.publicKey;
    }
    if (typeof address === 'string') address = new PublicKey(address);
    const tokenBalance = await this.connection!.getBalance(address!);
    return tokenBalance;
  }

  /**
   * Finds the MetaPlex metadata address for an NFT mint
   * See https://docs.metaplex.com/programs/token-metadata/changelog/v1.0
   * @param mint Publickey address of the NFT
   */
  getMetadataPDA(mint: PublicKey): PublicKey {
    const metaplexMetadata = new PublicKey(
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    );
    return pda(
      [utf8.encode('metadata'), metaplexMetadata.toBuffer(), mint.toBuffer()],
      metaplexMetadata,
    );
  }

  /**
   * Find the first NFT from `collection` owned by `owner`
   * @param owner Publickey address of the owner of the NFT
   * @param collection Publickey address of the NFT collection
   */
  async getNftFromCollection(
    owner: PublicKey | string,
    collection: string,
  ): Promise<PublicKey | undefined> {
    if (typeof owner === 'string') owner = new PublicKey(owner);
    const tokens = await this.connection!.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: 165, // number of bytes
          },
          {
            memcmp: {
              offset: 32, // number of bytes
              bytes: owner.toString(), // base58 encoded string
            },
          },
        ],
      },
    );
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const parsedData = (token.account.data as ParsedAccountData).parsed.info;
      const metadataAddress = this.getMetadataPDA(
        new PublicKey(parsedData.mint),
      );
      const info = await this.connection!.getAccountInfo(metadataAddress);
      if (info) {
        const collectionFromToken = bs58.encode(
          info.data
            .reverse()
            .subarray(279, 279 + 32)
            .reverse(),
        );
        if (collectionFromToken === collection) {
          return new PublicKey(parsedData.mint);
        }
      }
    }
    return;
  }

  /**
   * Create a NOS ATA for given address
   * @param address
   * @returns ATA public key
   */
  async createNosAta(address: string | PublicKey) {
    if (typeof address === 'string') address = new PublicKey(address);
    const ata = await getAssociatedTokenAddress(
      new PublicKey(this.config.nos_address),
      address,
    );
    let tx;
    try {
      await getAccount(this.connection!, ata);
    } catch (error) {
      try {
        tx = await createAssociatedTokenAccount(
          this.connection!,
          (this.provider?.wallet as KeyWallet).payer,
          new PublicKey(this.config.nos_address),
          address,
          {},
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );
      } catch (e) {
        console.error('createAssociatedTokenAccount', e);
      }
    }
    return tx;
  }

  /**
   * get the NOS ATA of an address
   * @param address
   * @returns ATA Publickey
   */
  async getNosATA(address: string | PublicKey) {
    if (typeof address === 'string') address = new PublicKey(address);
    const mint = new PublicKey(this.config.nos_address);
    const ata = await getAssociatedTokenAddress(mint, address);
    return ata;
  }

  /**
   * Function to load the Nosana Jobs program into JS
   * https://docs.nosana.io/programs/jobs.html
   */
  async loadNosanaJobs() {
    if (!this.jobs) {
      const programId = new PublicKey(this.config.jobs_address);
      const idl = (await Program.fetchIdl(programId.toString())) as Idl;
      this.jobs = new Program(idl, programId) as unknown as Program<NosanaJobs>;
    }
  }

  /**
   * Function to load the Nosana Nodes program into JS
   * https://docs.nosana.io/programs/nodes.html
   */
  async loadNosanaNodes() {
    if (!this.nodes) {
      const programId = new PublicKey(this.config.nodes_address);
      const idl = (await Program.fetchIdl(programId.toString())) as Idl;
      this.nodes = new Program(
        idl,
        programId,
      ) as unknown as Program<NosanaNodes>;
    }
  }

  /**
   * Function to load the Nosana Stake program into JS
   * https://docs.nosana.io/programs/staking.html
   */
  async loadNosanaStake() {
    if (!this.stake || !this.stake.program) {
      const programId = new PublicKey(this.config.stake_address);
      const poolProgramId = new PublicKey(this.config.pools_address);
      const rewardsProgramId = new PublicKey(this.config.rewards_address);
      const idl = (await Program.fetchIdl(programId.toString())) as Idl;
      const poolIdl = (await Program.fetchIdl(poolProgramId.toString())) as Idl;
      const rewardIdl = (await Program.fetchIdl(
        rewardsProgramId.toString(),
      )) as Idl;

      this.stake!.program = new Program(
        idl,
        programId,
      ) as unknown as Program<NosanaStake>;
      this.stake!.poolsProgram = new Program(poolIdl, poolProgramId);
      this.stake!.rewardsProgram = new Program(rewardIdl, rewardsProgramId);
    }
  }

  /**
   * Function to set and calculate most account addresses needed for instructions
   */
  async setAccounts() {
    if (!this.accounts) {
      await this.loadNosanaJobs();
      const authority = this.wallet.publicKey;
      const rewardsProgram = new PublicKey(this.config.rewards_address);
      const mint = new PublicKey(this.config.nos_address);
      const market = new PublicKey(this.config.market_address);
      this.accounts = {
        market,
        vault: pda([market.toBuffer(), mint.toBuffer()], this.jobs!.programId),
        user: await associatedAddress({
          mint,
          owner: this.provider!.wallet.publicKey,
        }),
        payer: authority,
        authority,
        rewardsVault: pda([mint.toBuffer()], rewardsProgram),
        rewardsReflection: pda([utf8.encode('reflection')], rewardsProgram),
        rewardsProgram,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
    }
  }

  async setStakeAccounts() {
    if (!this.stakeAccounts) {
      await this.loadNosanaStake();

      const poolId = new PublicKey(this.config.pool_address);
      const authority = this.provider!.wallet.publicKey;
      const rewardsProgramId = new PublicKey(this.config.rewards_address);
      const poolsProgramId = new PublicKey(this.config.pools_address);
      const mint = new PublicKey(this.config.nos_address);

      const [vault] = await PublicKey.findProgramAddress(
        [utf8.encode('vault'), mint.toBuffer(), authority.toBuffer()],
        new PublicKey(this.config.stake_address),
      );
      const [reward] = await PublicKey.findProgramAddress(
        [utf8.encode('reward'), authority.toBuffer()],
        rewardsProgramId,
      );
      const [reflection] = await PublicKey.findProgramAddress(
        [utf8.encode('reflection')],
        rewardsProgramId,
      );
      const [stake] = await PublicKey.findProgramAddress(
        [utf8.encode('stake'), mint.toBuffer(), authority.toBuffer()],
        new PublicKey(this.config.stake_address),
      );

      this.stakeAccounts = {
        // solana native
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        feePayer: authority,
        clock: SYSVAR_CLOCK_PUBKEY,

        // custom
        authority,
        stake,
        reflection,
        user: await getAssociatedTokenAddress(mint, authority),
        vault,
        reward,
        mint,
      };

      const [poolVault] = await PublicKey.findProgramAddress(
        [utf8.encode('vault'), poolId.toBuffer()],
        poolsProgramId,
      );

      const [rewardsVault] = await PublicKey.findProgramAddress(
        [mint.toBuffer()],
        rewardsProgramId,
      );

      this.poolAccounts = {
        ...this.stakeAccounts,
        pool: poolId,
        vault: poolVault,
        rewardsVault,
        rewardsReflection: this.stakeAccounts.reflection,
        rewardsProgram: rewardsProgramId,
      };
    }
  }
}

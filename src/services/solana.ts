import { AnchorProvider, Idl, Program, setProvider } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createTransferInstruction,
} from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  clusterApiUrl,
  Connection,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  sendAndConfirmTransaction,
  Transaction,
  ComputeBudgetProgram,
  Cluster,
  GetVersionedTransactionConfig,
  ParsedAccountData,
  TokenAmount,
} from '@solana/web3.js';
import { associatedAddress } from '@coral-xyz/anchor/dist/cjs/utils/token.js';
import { bs58, utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';
import nacl from 'tweetnacl';
import tweetnaclutil from 'tweetnacl-util';
import { Wallet as AnchorWallet } from '@coral-xyz/anchor';
import {
  keypairIdentity,
  generateSigner,
  transactionBuilder,
  signerIdentity,
  createSignerFromKeypair,
  base58,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  mplTokenMetadata,
  verifyCollectionV1,
  fetchMetadataFromSeeds,
  createFungibleAsset,
  createNft,
  fetchDigitalAsset,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  mplToolbox,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { percentAmount, publicKey, some } from '@metaplex-foundation/umi';

import { solanaConfigPreset } from '../config.js';
import type {
  NosanaJobs,
  SolanaConfig,
  NosanaNodes,
  NosanaStake,
  Wallet,
} from '../types/index.js';
import { KeyWallet, getWallet, pda, sleep } from '../utils.js';

const { decodeUTF8 } = tweetnaclutil;

const getPercentileFee = (
  fees: Array<{ prioritizationFee: number }>,
  percentile: number,
): number => {
  const index = Math.min(
    Math.floor(fees.length * (percentile / 100)),
    fees.length - 1,
  );
  return fees[index]?.prioritizationFee || 0;
};

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
  wallet: AnchorWallet;
  connection: Connection | undefined;
  constructor(
    environment: string = 'devnet',
    wallet: Wallet,
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
      'https://api.coingecko.com/api/v3/simple/price?ids=nosana&vs_currencies=usd',
    );
    const data = await result.json();
    return data.nosana;
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
    const tokens = (
      await this.connection!.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      })
    ).value;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      try {
        const parsedData = (token.account.data as ParsedAccountData).parsed
          .info;
        if (parsedData.tokenAmount.uiAmount < 1) {
          continue;
        }
        const metadataAddress = this.getMetadataPDA(
          new PublicKey(parsedData.mint),
        );
        const info = await this.connection!.getAccountInfo(metadataAddress);
        if (info) {
          let offset = 279;
          if (info.data.length === 607) {
            // New metadata account format
            offset = 207;
          }
          const verified = Buffer.from(info.data)
            .reverse()
            .subarray(offset + 32, offset + 33)
            .reverse()[0];
          const collectionFromToken = bs58.encode(
            info.data
              .reverse()
              .subarray(offset, offset + 32)
              .reverse(),
          );
          if (collectionFromToken === collection && verified) {
            return new PublicKey(parsedData.mint);
          }
        }
      } catch (e: any) {
        // continue
      }
    }
    return;
  }

  /**
   * Transfer NFT to other address
   * @param destination
   * @param nftAddress
   * @returns
   */
  async transferNft(
    destination: string | PublicKey,
    nftAddress: string | PublicKey,
  ) {
    if (typeof destination === 'string')
      destination = new PublicKey(destination);
    if (typeof nftAddress === 'string') nftAddress = new PublicKey(nftAddress);

    try {
      const transaction = new Transaction();
      if (this.config.priority_fee) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        transaction.add(addPriorityFee);
      }

      const destinationAta = await getAssociatedTokenAddress(
        nftAddress,
        destination,
      );

      const sourceAta = await getAssociatedTokenAddress(
        nftAddress,
        (this.provider?.wallet as KeyWallet).payer.publicKey,
      );

      // check if destination ATA already exists, if not create it
      try {
        const account = await getAccount(this.connection!, destinationAta);
      } catch (error) {
        // ata not found, try to create one
        transaction.add(
          createAssociatedTokenAccountInstruction(
            (this.provider?.wallet as KeyWallet).payer.publicKey,
            destinationAta,
            destination,
            nftAddress,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      transaction.add(
        createTransferInstruction(
          sourceAta,
          destinationAta,
          (this.provider?.wallet as KeyWallet).payer.publicKey,
          1,
        ),
      );

      const hash = await this.connection!.getLatestBlockhash();
      transaction.recentBlockhash = hash.blockhash;

      const tx = await sendAndConfirmTransaction(
        this.connection!,
        transaction,
        [(this.provider?.wallet as KeyWallet).payer],
        {},
      );
      return tx;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Create a NOS ATA for given address
   * @param address
   * @returns ATA public key
   */
  async createNosAta(
    address: string | PublicKey,
    instructionOnly: Boolean = false,
  ) {
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
        const associatedToken = getAssociatedTokenAddressSync(
          new PublicKey(this.config.nos_address),
          address,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        const transaction = new Transaction();
        if (this.config.priority_fee) {
          const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: this.config.priority_fee,
          });
          transaction.add(addPriorityFee);
        }
        transaction.add(
          createAssociatedTokenAccountInstruction(
            (this.provider?.wallet as KeyWallet).payer.publicKey,
            associatedToken,
            address,
            new PublicKey(this.config.nos_address),
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );

        if (instructionOnly) {
          return transaction.instructions;
        } else {
          await sendAndConfirmTransaction(
            this.connection!,
            transaction,
            [(this.provider?.wallet as KeyWallet).payer],
            {},
          );
          tx = associatedToken;
        }
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

  /**
   * Sign message with wallet
   * @param message
   * @param verify
   * @returns
   */
  signMessage(message: string, verify: boolean = false): Boolean | Uint8Array {
    const messageBytes = decodeUTF8(message);

    const signature = nacl.sign.detached(
      messageBytes,
      (this.provider?.wallet as KeyWallet).payer.secretKey,
    );
    if (verify) {
      const result = nacl.sign.detached.verify(
        messageBytes,
        signature,
        (this.provider?.wallet as KeyWallet).payer.publicKey.toBytes(),
      );

      return result;
    }

    return signature;
  }

  /**
   * Get transaction data
   * @param txs - array of transaction hashes
   * @param options - config GetVersionedTransactionConfig
   * @returns transactions[]
   */
  async getParsedTransactions(
    txs: string[],
    options: GetVersionedTransactionConfig,
  ) {
    return await this.connection!.getParsedTransactions(txs, options);
  }

  /**
   * Send NOS to address
   * @param amount
   * @param destination
   * @returns
   */
  async sendNos(
    amount: number,
    destination: string | PublicKey,
    instructionOnly: Boolean = false,
  ) {
    if (typeof destination === 'string')
      destination = new PublicKey(destination);
    try {
      const transaction = new Transaction();
      if (this.config.priority_fee && !instructionOnly) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        transaction.add(addPriorityFee);
      }

      const destinationAta = await getAssociatedTokenAddress(
        new PublicKey(this.config.nos_address),
        destination,
      );

      const sourceAta = await getAssociatedTokenAddress(
        new PublicKey(this.config.nos_address),
        (this.provider?.wallet as KeyWallet).payer.publicKey,
      );

      // check if destination ATA already exists, if not create it
      try {
        await getAccount(this.connection!, destinationAta);
      } catch (error) {
        // ata not found, try to create one
        transaction.add(
          createAssociatedTokenAccountInstruction(
            (this.provider?.wallet as KeyWallet).payer.publicKey,
            destinationAta,
            destination,
            new PublicKey(this.config.nos_address),
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      transaction.add(
        createTransferInstruction(
          sourceAta,
          destinationAta,
          (this.provider?.wallet as KeyWallet).payer.publicKey,
          amount,
        ),
      );

      if (instructionOnly) {
        return transaction.instructions;
      } else {
        const hash = await this.connection!.getLatestBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        return await sendAndConfirmTransaction(
          this.connection!,
          transaction,
          [(this.provider?.wallet as KeyWallet).payer],
          {},
        );
      }
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Send SOL to address
   * @param amount
   * @param destination
   * @param instructionOnly
   * @returns
   */
  async sendSol(
    amount: number,
    destination: string | PublicKey,
    instructionOnly: Boolean = false,
  ) {
    if (typeof destination === 'string')
      destination = new PublicKey(destination);
    try {
      const transaction = new Transaction();
      if (this.config.priority_fee && !instructionOnly) {
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.priority_fee,
        });
        transaction.add(addPriorityFee);
      }
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: (this.provider?.wallet as KeyWallet).payer.publicKey,
          toPubkey: destination,
          lamports: amount,
        }),
      );

      if (instructionOnly) {
        return transaction.instructions;
      } else {
        const hash = await this.connection!.getLatestBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        return await sendAndConfirmTransaction(
          this.connection!,
          transaction,
          [(this.provider?.wallet as KeyWallet).payer],
          {},
        );
      }
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Create a Collection with Nosana Node config
   */
  async createNodeCollection() {
    const umi = createUmi(this.config.network, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000,
    })
      .use(mplTokenMetadata())
      .use(mplToolbox());

    const signer = createSignerFromKeypair(
      umi,
      fromWeb3JsKeypair((this.provider?.wallet as KeyWallet).payer),
    );
    umi.use(signerIdentity(signer));

    console.log(`Creating collection...`);
    const collectionMint = generateSigner(umi);
    const transaction = await createNft(umi, {
      mint: collectionMint,
      name: 'Nosana Node Collection',
      symbol: 'NOS-NODE',
      uri: 'https://shdw-drive.genesysgo.net/3ndTeBWA1s9ETaivEMUcEULomQnmNkY1cE4Gb1N6r6Ec/nosana-node.json',
      sellerFeeBasisPoints: percentAmount(100),
      isCollection: true,
      creators: [
        {
          address: publicKey('NosanarMxfrZbyCx5CotBVrzxiPcrnhj6ickpX9vRkB'),
          verified: false,
          share: 100,
        },
      ],
    }).prepend(
      setComputeUnitPrice(umi, {
        microLamports: this.config.priority_fee ? this.config.priority_fee : 0,
      }),
    );

    const tx = await transaction.sendAndConfirm(umi);

    const createdCollectionNft = await fetchDigitalAsset(
      umi,
      collectionMint.publicKey,
    );
    console.log(
      'Created collection',
      createdCollectionNft.mint.publicKey.toString(),
    );

    return {
      collection: createdCollectionNft.mint.publicKey.toString(),
      tx: base58.deserialize(tx.signature)[0],
    };
  }

  /**
   * Create & verify SFT for collection
   * @param collectionAddress - string
   */
  async createAndVerifySft(collectionAddress: string) {
    const umi = createUmi(this.config.network, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000,
    })
      .use(mplTokenMetadata())
      .use(mplToolbox());
    const signer = createSignerFromKeypair(
      umi,
      fromWeb3JsKeypair((this.provider?.wallet as KeyWallet).payer),
    );
    umi.use(signerIdentity(signer));

    const umiKeypair = keypairIdentity(
      fromWeb3JsKeypair((this.provider?.wallet as KeyWallet).payer),
    );
    umi.use(umiKeypair);

    const newMint = generateSigner(umi);
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000,
    });

    const createSFTix = await createFungibleAsset(umi, {
      mint: newMint,
      authority: umi.identity,
      updateAuthority: umi.identity,
      name: 'Nosana Node SFT',
      uri: 'https://shdw-drive.genesysgo.net/3ndTeBWA1s9ETaivEMUcEULomQnmNkY1cE4Gb1N6r6Ec/nosana-node.json',
      sellerFeeBasisPoints: percentAmount(0),
      decimals: some(0), // for 0 decimals use some(0)
      isMutable: true,
      isCollection: false,
      collection: {
        verified: false,
        key: publicKey(collectionAddress),
      },
    });
    await createSFTix
      .prepend(
        transactionBuilder([
          // @ts-ignore
          { instruction: addPriorityFee, bytesCreatedOnChain: 0, signers: [] },
        ]),
      )
      .sendAndConfirm(umi);

    console.log('Created SFT address', newMint.publicKey.toString());

    await sleep(5);

    const metadata = await fetchMetadataFromSeeds(umi, {
      // @ts-ignore
      mint: newMint,
    });

    const verifyCollection = await verifyCollectionV1(umi, {
      collectionMint: publicKey(collectionAddress),
      // @ts-ignore
      metadata: metadata,
      authority: umi.identity,
    });
    const tx = await verifyCollection
      .prepend(
        transactionBuilder([
          // @ts-ignore
          { instruction: addPriorityFee, bytesCreatedOnChain: 0, signers: [] },
        ]),
      )
      .sendAndConfirm(umi);
    console.log('Verified NFT collection', collectionAddress);

    return {
      tx,
      sft: newMint.publicKey.toString(),
    };
  }

  private async getRecentPrioritizationFees(): Promise<
    {
      prioritizationFee: number;
    }[]
  > {
    const SOL_MINT = new PublicKey(
      'So11111111111111111111111111111111111111112',
    );
    const USDC_MINT = new PublicKey(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    );
    const queryAccounts = [SOL_MINT.toBase58(), USDC_MINT.toBase58()];

    const rawBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getRecentPrioritizationFees',
      params: [queryAccounts],
    };

    const resp = await fetch(this.config.network, {
      method: 'POST',
      body: JSON.stringify(rawBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await resp.json();

    return json?.result || [];
  }

  async getPriorityFee(accounts?: PublicKey[]): Promise<number> {
    const {
      priority_fee: MINIMUM_PRIORITY_FEE = 0,
      maximumPriorityFee: MAXIMUM_PRIORITY_FEE = 50000000,
      dynamicPriorityFee: DYNAMIC_PRIORITY_FEE = false,
    } = this.config;

    if (MAXIMUM_PRIORITY_FEE < MINIMUM_PRIORITY_FEE) {
      throw new Error('Maximum priority fee cannot be less than priority fee');
    }

    if (!DYNAMIC_PRIORITY_FEE) {
      return MINIMUM_PRIORITY_FEE;
    }

    try {
      const fees = await this.getRecentPrioritizationFees();

      if (fees.length === 0) {
        console.log(
          `No recent fees found, using static fee - Raw: ${MINIMUM_PRIORITY_FEE}, After limits: ${MINIMUM_PRIORITY_FEE} microLamports`,
        );
        return MINIMUM_PRIORITY_FEE;
      }

      // Sort in ascending order for percentile calculation
      fees.sort((a: any, b: any) => a.prioritizationFee - b.prioritizationFee);

      const feeLevels = {
        min: getPercentileFee(fees, 0), // 0th percentile
        low: getPercentileFee(fees, 25), // 25th percentile
        medium: getPercentileFee(fees, 50), // 50th percentile
        high: getPercentileFee(fees, 70), // 70th percentile
        veryHigh: getPercentileFee(fees, 85), // 85th percentile
        unsafeMax: getPercentileFee(fees, 100), // 100th percentile
      };

      console.log('\nPriority Fees (microLamports):');
      console.log(`  Min (0th): ${feeLevels.min}`);
      console.log(`  Low (25th): ${feeLevels.low}`);
      console.log(`  Medium (50th): ${feeLevels.medium}`);
      console.log(`  High (70th): ${feeLevels.high}`);
      console.log(`  Very High (85th): ${feeLevels.veryHigh}`);
      console.log(`  Unsafe Max (100th): ${feeLevels.unsafeMax}`);

      const strategy = this.config.priorityFeeStrategy || 'medium';
      const selectedFee: number = feeLevels[strategy] ?? feeLevels.medium;

      // Apply limits
      const finalFee = Math.min(
        Math.max(selectedFee, MINIMUM_PRIORITY_FEE),
        MAXIMUM_PRIORITY_FEE,
      );
      if (finalFee !== selectedFee) {
        console.log(
          `Fee adjusted from ${selectedFee} to ${finalFee} to meet limits (${MINIMUM_PRIORITY_FEE} - ${MAXIMUM_PRIORITY_FEE})`,
        );
      }
      return finalFee;
    } catch (err) {
      console.error('Priority fee error:', err);
      console.log(
        `Falling back to static priority fee - Raw: ${MINIMUM_PRIORITY_FEE}, After limits: ${MINIMUM_PRIORITY_FEE} microLamports`,
      );
      return MINIMUM_PRIORITY_FEE;
    }
  }
}

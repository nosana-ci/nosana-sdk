import {
  AnchorProvider,
  Idl,
  Program,
  setProvider,
  Wallet as AnchorWallet,
} from '@coral-xyz/anchor';
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
  Keypair,
  Signer,
} from '@solana/web3.js';
import { associatedAddress } from '@coral-xyz/anchor/dist/cjs/utils/token.js';
import { bs58, utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';
import nacl from 'tweetnacl';
import tweetnaclutil from 'tweetnacl-util';
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

import { solanaConfigPreset, sourceMintPreset } from '../config.js';
import type {
  NosanaJobs,
  NosanaNodes,
  NosanaStake,
  SolanaConfig,
  Wallet,
} from '../types/index.js';
import { KeyWallet, getWallet, pda, sleep } from '../utils.js';
import { NosanaProgram } from '../classes/nosanaProgram/index.js';
import { MethodsBuilder } from '@coral-xyz/anchor/dist/cjs/program/namespace/methods.js';

const { decodeUTF8 } = tweetnaclutil;

/**
 * Class to interact with Nosana Programs on the Solana Blockchain,
 * with the use of Anchor.
 */
export class SolanaManager {
  config: SolanaConfig;
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
  wallet: AnchorWallet;
  feePayer?: Signer;
  connection: Connection | undefined;
  sourceMints: { SOL: string; USDC?: string; USDT?: string };
  constructor(environment: string = 'devnet',
    wallet: Wallet,
    config?: Partial<SolanaConfig>,
  ) {
    this.config = solanaConfigPreset[environment];
    this.sourceMints = sourceMintPreset[environment];
    Object.assign(this.config, config);

    this.wallet = getWallet(wallet);
    this.feePayer = this.config.feePayer;

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

  async sendAndConfirm(txBuilder: MethodsBuilder<any, any>) {
    const tx = await txBuilder.transaction();
    if (this.feePayer) {
      txBuilder.signers([this.feePayer]);
      tx.feePayer = this.feePayer.publicKey;
    }
    const { signers } = await txBuilder.prepare();
    return this.provider!.sendAndConfirm(tx, signers);
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
    return this.getTokenBalance(this.config.nos_address, address);
  }

  /**
   * Get USDC balance of an address
   * @param address Optional address to check balance for, defaults to wallet's address
   * @returns Token balance information
   */
  async getUsdcBalance(
    address?: string | PublicKey,
  ): Promise<TokenAmount | undefined> {
    if (!this.sourceMints.USDC) {
      return undefined;
    }
    return this.getTokenBalance(this.sourceMints.USDC, address);
  }

  /**
   * Get USDT balance of an address
   * @param address Optional address to check balance for, defaults to wallet's address
   * @returns Token balance information
   */
  async getUsdtBalance(
    address?: string | PublicKey,
  ): Promise<TokenAmount | undefined> {
    if (!this.sourceMints.USDT) {
      return undefined;
    }
    return this.getTokenBalance(this.sourceMints.USDT, address);
  }

  /**
   * Generic method to get any token's balance
   * @param tokenMint The mint address of the token
   * @param address Optional address to check balance for, defaults to wallet's address
   * @returns Token balance information
   */
  async getTokenBalance(
    tokenMint: string | PublicKey,
    address?: string | PublicKey,
  ): Promise<TokenAmount | undefined> {
    if (!address) {
      address = this.provider?.wallet.publicKey;
    }
    if (typeof address === 'string') address = new PublicKey(address);
    if (typeof tokenMint === 'string') tokenMint = new PublicKey(tokenMint);

    const account = await this.connection!.getTokenAccountsByOwner(address!, {
      mint: tokenMint,
    });
    if (!account.value[0]) return;

    const tokenAddress = new PublicKey(account.value[0].pubkey.toString());
    const tokenBalance = await this.connection!.getTokenAccountBalance(
      tokenAddress,
    );
    return tokenBalance.value;
  }

  /**
   * Get native SOL balance of an address
   * @param address Optional address to check balance for, defaults to wallet's address
   * @returns Balance in lamports (1 SOL = 1e9 lamports)
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
      const idl = await Program.fetchIdl<NosanaJobs>(programId.toString());

      if (!idl) {
        throw new Error("Couldn't fetch IDL for Jobs program");
      }

      this.jobs = new NosanaProgram<NosanaJobs>(this.config, idl, programId);
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

  /**
   * Check if a transaction is confirmed or finalized
   * @param transactionHash - The transaction signature to check
   * @returns boolean indicating if transaction is confirmed/finalized
   */
  public async checkTransactionConfirmation(
    transactionHash: string,
  ): Promise<boolean> {
    try {
      if (!this.connection) {
        return false;
      }

      const statuses = await this.connection.getSignatureStatuses(
        [transactionHash],
        {
          searchTransactionHistory: true,
        },
      );
      const status = statuses.value[0];

      if (status && !status.err) {
        const confirmationStatus = status.confirmationStatus;
        return (
          confirmationStatus === 'confirmed' ||
          confirmationStatus === 'finalized'
        );
      }

      return false;
    } catch (error) {
      console.error(
        `Error checking transaction confirmation for ${transactionHash}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Poll a transaction's status until it confirms or times out
   * @param transactionHash - The transaction signature to monitor
   * @param lastValidBlockHeight - The last valid block height for the transaction
   * @param maxWaitTimeMs - Maximum time to wait for confirmation in milliseconds
   * @returns Object containing success status and optional error information
   */
  public async pollTransactionStatus(
    transactionHash: string,
    lastValidBlockHeight: number,
    maxWaitTimeMs: number = 30000,
  ): Promise<{ success: boolean; expired?: boolean; error?: any }> {
    if (!this.connection) {
      throw new Error('Solana connection not available');
    }

    const startTime = Date.now();
    let checkCount = 0;

    while (Date.now() - startTime < maxWaitTimeMs) {
      checkCount++;
      const currentBlockHeight = await this.connection.getBlockHeight();

      // check if blockhash has expired
      if (currentBlockHeight > lastValidBlockHeight) {
        console.log('Blockhash expired - transaction definitely failed');
        return { success: false, expired: true };
      }

      const statuses = await this.connection.getSignatureStatuses(
        [transactionHash],
        {
          searchTransactionHistory: true,
        },
      );
      const status = statuses.value[0];

      if (status) {
        // check if transaction failed
        if (status.err) {
          return { success: false, error: status.err };
        }

        if (
          status.confirmationStatus === 'finalized' ||
          status.confirmationStatus === 'confirmed'
        ) {
          console.log(
            `Transaction confirmed/finalized after ${checkCount} checks`,
          );
          return { success: true };
        } else if (status.confirmationStatus === 'processed') {
          console.log(
            `Transaction ${transactionHash} is processed, waiting for confirmation...`,
          );
        }
      }

      await sleep(1);
    }

    throw new Error(
      'Transaction confirmation timeout - please wait before retrying',
    );
  }
}

import {
  Cluster,
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { clientSelector } from '../client/index.js';
import { errorFormatter } from '../errors.js';
import { TokenManager } from '../../../classes/tokenManager/index.js';
import { getNosTokenAddressForAccount } from '../../../classes/tokenManager/helpers/NOS/getNosTokenAddressForAccount.js';

export class Vault {
  public publicKey: PublicKey;
  private wallet: Wallet;
  private connection: Connection;
  private nos_address: string;

  constructor(
    publicKey: PublicKey,
    wallet: Wallet,
    rpc_network: string,
    nos_address: string,
  ) {
    this.publicKey = publicKey;
    this.wallet = wallet;
    this.nos_address = nos_address;

    let node = rpc_network;
    if (!node.includes('http')) {
      node = clusterApiUrl(node as Cluster);
    }

    this.connection = new Connection(node, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60 * 1000,
    });
  }

  async getBalance(): Promise<{ SOL: number; NOS: number }> {
    const solBalance = await this.connection.getBalance(this.publicKey);
    const { balance } = await getNosTokenAddressForAccount(
      this.publicKey,
      this.nos_address,
      this.connection,
    );

    return {
      SOL: solBalance / LAMPORTS_PER_SOL,
      NOS: balance ? balance / 1e6 : 0,
    };
  }

  async topup({
    SOL = 0,
    NOS = 0,
    lamports = false,
  }: {
    SOL?: number;
    NOS?: number;
    lamports?: boolean;
  }) {
    const manager = new TokenManager(
      this.wallet.publicKey,
      this.publicKey,
      'SOURCE',
      this.nos_address,
      this.connection,
    );

    try {
      if (NOS > 0) {
        await manager.addNOS(lamports ? NOS : NOS * 1e6);
      }

      if (SOL > 0) {
        await manager.addSOL(lamports ? SOL : SOL * LAMPORTS_PER_SOL);
      }

      await manager.transfer([this.wallet.payer]);
    } catch (e) {
      errorFormatter('Failed to topup vault.', { error: (e as Error).message });
    }
  }

  async withdraw() {
    const client = clientSelector(this.wallet);

    const { data, error } = await client.POST(
      // @ts-ignore
      `/vault/${this.publicKey.toString()}/withdraw`,
      {},
    );

    if (error) {
      errorFormatter('Failed to withdraw from vault', error);
    }

    const transaction = VersionedTransaction.deserialize(
      // @ts-ignore
      new Uint8Array(Buffer.from(data.transaction, 'base64')),
    );
    transaction.sign([this.wallet.payer]);

    try {
      const signature = await this.connection.sendTransaction(transaction);
      const latestBlockHash = await this.connection.getLatestBlockhash();

      await this.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      });
    } catch {
      errorFormatter('Vault withdrawal transaction failed.', error);
    }
  }
}

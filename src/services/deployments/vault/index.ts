import {
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { clientSelector } from '../client';
import { TokenManager } from '../../../classes/tokenManager';
import { ConnectionSelector } from '../../../classes/connection/selector';
import { getNosTokenAddressForAccount } from '../../../classes/tokenManager/helpers/NOS/getNosTokenAddressForAccount';
import { errorFormatter } from '../../../utils/errorFormatter';

export class Vault {
  public publicKey: PublicKey;
  private wallet: Wallet;

  constructor(publicKey: PublicKey, wallet: Wallet) {
    this.publicKey = publicKey;
    this.wallet = wallet;
  }

  async getBalance(): Promise<{ SOL: number; NOS: number }> {
    const connection = ConnectionSelector();
    const solBalance = await connection.getBalance(this.publicKey);
    const { balance } = await getNosTokenAddressForAccount(
      this.publicKey,
      connection,
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
      errorFormatter('Failed to topup vault.', e);
    }
  }

  async withdraw() {
    const connection = ConnectionSelector();
    const client = clientSelector(this.wallet);

    const { data, error } = await client.POST(
      `/vault/${this.publicKey.toString()}/withdraw`,
      {},
    );

    if (error) {
      errorFormatter('Failed to withdraw from vault', error);
    }

    const transaction = VersionedTransaction.deserialize(
      Buffer.from(data.transaction, 'base64'),
    );
    transaction.sign([this.wallet.payer]);

    try {
      const signature = await connection.sendTransaction(transaction);
      const latestBlockHash = await connection.getLatestBlockhash();

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      });
    } catch {
      errorFormatter('Vault withdrawal transaction failed.', error);
    }
  }
}

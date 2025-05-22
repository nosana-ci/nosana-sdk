import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { ConnectionSelector } from '../../../classes/connection/selector';
import { TokenManager } from '../tokenManager';
import { getNosTokenAddressForAccount } from '../tokenManager/helpers/NOS/getNosTokenAddressForAccount';

export class Vault {
  public publicKey: PublicKey;
  private wallet: Wallet;

  constructor(publicKey: PublicKey, wallet: Wallet) {
    this.publicKey = publicKey;
    this.wallet = wallet;
  }

  async getBalance() {
    const connection = ConnectionSelector();
    const solBalance = await connection.getBalance(this.publicKey);
    const { balance } = await getNosTokenAddressForAccount(
      this.publicKey,
      connection,
    );

    return {
      sol: solBalance / LAMPORTS_PER_SOL,
      nos: balance ? balance / 1e6 : 0,
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
      console.log(e);
    }
  }

  async widthdraw() {}
}

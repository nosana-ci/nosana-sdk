import {
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { topupNos, topupSol } from './helpers';
import { ConnectionSelector } from '../../../classes/connection/selector';

export class Vault {
  public publicKey: PublicKey;
  public balance: {
    sol: number;
    nos: number;
  };
  private wallet: Wallet;

  constructor(
    publicKey: PublicKey,
    sol: number = 0,
    nos: number = 0,
    wallet: Wallet,
  ) {
    this.publicKey = publicKey;
    this.balance = {
      sol,
      nos,
    };
    this.wallet = wallet;
  }

  async topup({
    sol = 0,
    nos = 0,
    lamports = false,
  }: {
    sol?: number;
    nos?: number;
    lamports?: boolean;
  }) {
    const connection = ConnectionSelector();
    const transaction = new Transaction();

    if (nos > 0) {
      await topupNos(
        lamports ? nos : nos * 1e6,
        this.publicKey,
        this.wallet,
        transaction,
      );
    }

    if (sol > 0) {
      await topupSol(
        lamports ? sol : sol * LAMPORTS_PER_SOL,
        this.publicKey,
        this.wallet,
        transaction,
      );
    }

    try {
      await sendAndConfirmTransaction(connection, transaction, [
        this.wallet.payer,
      ]);
    } catch (e) {
      console.log(e);
    }
  }

  async widthdraw() {}
}

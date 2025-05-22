import { Wallet } from '@coral-xyz/anchor';
import {
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  Transaction,
} from '@solana/web3.js';

import { ConnectionSelector } from '../../../classes/connection/selector';
import { createTransferNOSInstruction } from './helpers/NOS/createTransferNOSInstruction';
import { createTransferSOLInstruction } from './helpers/SOL/createTransferSOLInstruction';

export class TokenManager {
  public transaction: Transaction;
  public sourceWallet: PublicKey;
  public destinationWallet: PublicKey;
  private wallet: Wallet;

  constructor(
    sourceWallet: PublicKey | string,
    destinationWallet: PublicKey | string,
    wallet: Wallet,
  ) {
    this.wallet = wallet;
    this.transaction = new Transaction();
    this.sourceWallet =
      typeof sourceWallet === 'string'
        ? new PublicKey(sourceWallet)
        : sourceWallet;
    this.destinationWallet =
      typeof destinationWallet === 'string'
        ? new PublicKey(destinationWallet)
        : destinationWallet;
  }

  public async addNOS(payer: 'SOURCE' | 'DESTINATION', amount?: number) {
    await createTransferNOSInstruction(
      amount ?? 0,
      this.sourceWallet,
      this.destinationWallet,
      payer === 'SOURCE' ? this.sourceWallet : this.destinationWallet,
      this.transaction,
    );
  }

  public async addSOL(payer: 'SOURCE' | 'DESTINATION', amount?: number) {
    await createTransferSOLInstruction(
      amount ?? 0,
      this.sourceWallet,
      this.destinationWallet,
      this.transaction,
    );
  }

  public async sign(signer: Signer) {
    this.transaction.sign(signer);
  }

  public async transfer() {
    const connection = ConnectionSelector();

    await sendAndConfirmTransaction(connection, this.transaction, [
      this.wallet.payer,
    ]);
  }
}

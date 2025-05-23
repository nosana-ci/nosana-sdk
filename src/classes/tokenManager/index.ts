import {
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  Transaction,
} from '@solana/web3.js';

import { ConnectionSelector } from '../connection/selector';
import { createTransferNOSInstruction } from './helpers/NOS/createTransferNOSInstruction';
import { createTransferSOLInstruction } from './helpers/SOL/createTransferSOLInstruction';

export class TokenManager {
  public transaction: Transaction;
  public sourceWallet: PublicKey;
  public destinationWallet: PublicKey;
  public payer: 'SOURCE' | 'DESTINATION';

  constructor(
    sourceWallet: PublicKey | string,
    destinationWallet: PublicKey | string,
    payer: 'SOURCE' | 'DESTINATION',
  ) {
    this.payer = payer;
    this.transaction = new Transaction();
    this.sourceWallet =
      typeof sourceWallet === 'string'
        ? new PublicKey(sourceWallet)
        : sourceWallet;
    this.destinationWallet =
      typeof destinationWallet === 'string'
        ? new PublicKey(destinationWallet)
        : destinationWallet;

    this.transaction.feePayer =
      payer === 'SOURCE' ? this.sourceWallet : this.destinationWallet;
  }

  public async addNOS(amount?: number) {
    await createTransferNOSInstruction(
      amount ?? 0,
      this.sourceWallet,
      this.destinationWallet,
      this.payer === 'SOURCE' ? this.sourceWallet : this.destinationWallet,
      this.transaction,
    );
  }

  public async addSOL(amount?: number) {
    await createTransferSOLInstruction(
      amount ?? 0,
      this.sourceWallet,
      this.destinationWallet,
      this.transaction,
    );
  }

  public async signAndSerialize(signer: Signer): Promise<string> {
    const connection = ConnectionSelector();
    let blockhash = (await connection.getLatestBlockhash('finalized'))
      .blockhash;
    this.transaction.recentBlockhash = blockhash;
    this.transaction.sign(signer);
    return this.transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64');
  }

  public async transfer(signers: Signer[]) {
    const connection = ConnectionSelector();
    await sendAndConfirmTransaction(connection, this.transaction, signers);
  }
}

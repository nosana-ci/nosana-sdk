import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  Transaction,
} from '@solana/web3.js';

import { createTransferNOSInstruction } from './helpers/NOS/createTransferNOSInstruction.js';
import { createTransferSOLInstruction } from './helpers/SOL/createTransferSOLInstruction.js';

export class TokenManager {
  public transaction: Transaction;
  public sourceWallet: PublicKey;
  public destinationWallet: PublicKey;
  public payer: 'SOURCE' | 'DESTINATION';
  private connection: Connection;
  private nos_address: string;

  constructor(
    sourceWallet: PublicKey | string,
    destinationWallet: PublicKey | string,
    payer: 'SOURCE' | 'DESTINATION',
    nos_address: string,
    connection: Connection,
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

    this.nos_address = nos_address;
    this.connection = connection;
  }

  public async addNOS(amount?: number) {
    await createTransferNOSInstruction(
      amount ?? 0,
      this.sourceWallet,
      this.destinationWallet,
      this.payer === 'SOURCE' ? this.sourceWallet : this.destinationWallet,
      this.transaction,
      this.nos_address,
      this.connection,
    );
  }

  public async addSOL(amount?: number) {
    await createTransferSOLInstruction(
      amount ?? 0,
      this.sourceWallet,
      this.destinationWallet,
      this.transaction,
      this.connection,
    );
  }

  public async signAndSerialize(signer: Signer): Promise<string> {
    let blockhash = (await this.connection.getLatestBlockhash('finalized'))
      .blockhash;
    this.transaction.recentBlockhash = blockhash;
    this.transaction.sign(signer);
    return this.transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64');
  }

  public async transfer(signers: Signer[]) {
    await sendAndConfirmTransaction(this.connection, this.transaction, signers);
  }
}

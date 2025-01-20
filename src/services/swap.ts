import fetch from 'cross-fetch';
import { VersionedTransaction, PublicKey, Keypair } from '@solana/web3.js';
import { SolanaManager } from './solana';
import { Buffer } from 'buffer';
import type { Wallet, SolanaConfig } from '../types/index.js';
import { KeyWallet } from '../utils.js';

// We recommend using your own API keys and endpoints in production code.
// These examples and default URLs are for demonstration.

export interface JupiterQuoteParams {
  inputMint: string;      // e.g. "So11111111111111111111111111111111111111112"
  outputMint: string;     // e.g. "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  amount: number;         // The amount in smallest unit (e.g. 0.1 SOL => 100000000)
  slippageBps?: number;   // Defaults to 50 => 0.5%
  excludeDexes?: string[]; // Optionally exclude certain dex labels ["Raydium","Orca",...]
  maxAccounts?: number;    // e.g. 54. Use if you want to keep the instruction list smaller
}

export interface JupiterQuoteResponse {
  // The response from calling Jupiter's /quote endpoint
  data?: any;    // If you get the "data" array from Jupiter
  // ... or the entire JSON shape from the /quote call.
  // This is flexible. Adjust as needed for your usage.
}

export interface JupiterSwapOptions {
  wrapAndUnwrapSol?: boolean; 
  dynamicSlippage?: { maxBps: number };  
  // Optionally set priority fees, for example:
  // prioritizationFeeLamports?: {
  //   priorityLevelWithMaxLamports: { maxLamports: number; priorityLevel: string };
  // };
  // feeAccount?: string; // If you want to charge a fee, pass the token account that receives the fee
}

export class Swap extends SolanaManager {
  constructor(environment: string = 'mainnet-beta', wallet?: Wallet, config?: Partial<SolanaConfig>) {
    super(environment, wallet || new KeyWallet(Keypair.generate()), config);
    console.log('Swap service initialized!');
  }

  /**
   * Get a quote from Jupiter's /quote endpoint.
   */
  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50,
      excludeDexes,
      maxAccounts,
    } = params;

    let url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;

    if (excludeDexes && excludeDexes.length > 0) {
      url += `&excludeDexes=${excludeDexes.join(',')}`;
    }

    if (maxAccounts) {
      url += `&maxAccounts=${maxAccounts}`;
    }

    const response = await fetch(url);
    const quoteResponse = await response.json();
    return quoteResponse;
  }

  /**
   * Execute a swap based on a Jupiter quote JSON (the /quote response).
   */
  async executeSwap(
    quoteResponse: any, 
    options: JupiterSwapOptions = {}
  ): Promise<string> {
    const {
      wrapAndUnwrapSol = true,
      dynamicSlippage,
      // If you have a prioritization fee or feeAccount, you can add them here
      // prioritizationFeeLamports,
      // feeAccount,
    } = options;

    // Construct the swap request body
    const body: Record<string, any> = {
      quoteResponse,
      userPublicKey: this.provider!.wallet.publicKey.toString(),
      wrapAndUnwrapSol,
    };

    if (dynamicSlippage) {
      body.dynamicSlippage = dynamicSlippage;
    }

    // If you have a custom prioritization fee:
    // if (prioritizationFeeLamports) {
    //   body.prioritizationFeeLamports = prioritizationFeeLamports;
    // }

    // If you have a fee account:
    // if (feeAccount) {
    //   body.feeAccount = feeAccount;
    // }

    // Call Jupiter /swap endpoint
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const { swapTransaction, error, simulationError, ...rest } = await response.json();

    if (error) {
      throw new Error(`Jupiter swap error: ${error}`);
    }

    if (!swapTransaction) {
      // If no transaction is returned, handle as necessary
      throw new Error('No swap transaction returned from Jupiter /swap endpoint.');
    }

    // Deserialize the base64 transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    // We are using VersionedTransaction because Jupiter returns a Versioned TX
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign the transaction with our wallet
    transaction.sign([
      (this.provider?.wallet as any).payer || this.provider!.wallet, 
    ]);

    // Send the transaction
    // You can adjust the send options as needed (skipPreflight, maxRetries, etc.)
    const latestBlockHash = await this.connection!.getLatestBlockhash();
    const txid = await this.connection!.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: true,
        maxRetries: 3,
      },
    );

    // Confirm the transaction
    await this.connection!.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });

    return txid;
  }
} 
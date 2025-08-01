import { VersionedTransaction } from '@solana/web3.js';

import { SOURCE_MINTS } from '../config.js';
import { SolanaManager } from './solana.js';
import { QuoteResponse, SwapResponse } from '../types/swap.js';

type SourceToken = 'SOL' | 'USDC' | 'USDT';

export class Swap extends SolanaManager {
  /**
   * Swap a chosen token (SOL, USDC, or USDT) to NOS (stand-alone method: does not list jobs)
   *
   * @param amount The amount of NOS (in whole tokens) to acquire
   * @param source One of 'SOL', 'USDC', or 'USDT'
   * @returns Object containing the transaction signature
   */
  public async swapToNos(amount: number, source: SourceToken): Promise<string> {
    const inputMint = SOURCE_MINTS[source];

    if (!inputMint) {
      throw new Error(`Unsupported source token: ${source}`);
    }

    const quote = await this.requestQuote(amount, inputMint);
    const { lastValidBlockHeight, swapTransaction } =
      await this.requestTransaction(quote, source === 'SOL');

    return await this.makeSwapTransaction(
      lastValidBlockHeight,
      swapTransaction,
    );
  }

  private async requestQuote(
    amount: number,
    inputMint: string,
  ): Promise<QuoteResponse> {
    const { nos_address: outputMint } = this.config;
    // Convert NOS needed to its atomic amount (e.g., 6 decimals)
    const nosAmountRaw = Math.ceil(amount * 1_000_000).toString();

    const quoteResponse = await (
      await fetch(
        `https://lite-api.jup.ag/swap/v1/quote?${new URLSearchParams({
          inputMint,
          outputMint, // NOS mint
          swapMode: 'ExactOut', // we want exactly `nosNeeded`
          amount: nosAmountRaw.toString(),
          slippageBps: '50', // example slippage
          restrictIntermediateTokens: 'true', // Helps reduce exposure to high slippage routes
        }).toString()}`,
      )
    ).json();

    // Check quote response
    if (quoteResponse.error) {
      throw new Error(`Jupiter quote error: ${quoteResponse.error}`);
    }
    if (!quoteResponse.outAmount) {
      throw new Error(
        `No valid quote found. amount=${nosAmountRaw} inputMint=${inputMint} outputMint=${this.config.nos_address}`,
      );
    }

    return quoteResponse as QuoteResponse;
  }

  private async requestTransaction(
    quote: QuoteResponse,
    isSol: boolean,
  ): Promise<SwapResponse> {
    const {
      dynamicPriorityFee,
      maximumPriorityFee,
      priorityFeeStrategy,
      priority_fee,
    } = this.config;

    const swapResponse = await (
      await fetch('https://lite-api.jup.ag/swap/v1/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPublicKey: this.provider!.wallet.publicKey.toString(),
          wrapAndUnwrapSol: isSol,
          useSharedAccounts: true,
          dynamicComputeUnitLimit: !!dynamicPriorityFee,
          skipUserAccountsRpcCalls: false,
          ...(dynamicPriorityFee
            ? {
                prioritizationFeeLamports: {
                  priorityLevelWithMaxLamports: {
                    maxLamports: maximumPriorityFee ?? 50000000,
                    priorityLevel: priorityFeeStrategy ?? 'medium',
                  },
                },
              }
            : { computeUnitPriceMicroLamports: priority_fee }),
          quoteResponse: quote,
        }),
      })
    ).json();

    if (swapResponse.error) {
      throw new Error(`Jupiter swap error: ${swapResponse.error}`);
    }

    if (!swapResponse.swapTransaction) {
      throw new Error(
        `No swapTransaction returned by Jupiter: ${JSON.stringify(
          swapResponse,
        )}`,
      );
    }

    return swapResponse as SwapResponse;
  }

  private async makeSwapTransaction(
    lastValidBlockHeight: SwapResponse['lastValidBlockHeight'],
    swapTransaction: SwapResponse['swapTransaction'],
  ): Promise<string> {
    const { blockhash } = await this.connection!.getLatestBlockhash();

    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    const signedTx = await this.provider!.wallet.signTransaction(transaction);
    const txid = await this.connection!.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        maxRetries: 5,
      },
    );

    await this.connection!.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature: txid,
      },
      'processed',
    );

    return txid;
  }
}

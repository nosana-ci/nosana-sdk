import { VersionedTransaction } from '@solana/web3.js';

import { SolanaManager } from './solana.js';
import { QuoteResponse, SwapResponse } from '../types/swap.js';

type SourceToken = 'SOL' | 'USDC' | 'USDT';

export class Swap extends SolanaManager {
  /**
   * Swap a chosen token (SOL, USDC, or USDT) to NOS (stand-alone method: does not list jobs)
   *
   * @param amount The amount of source token to spend (in whole tokens)
   * @param source One of 'SOL', 'USDC', or 'USDT'
   * @returns Object containing the transaction signature
   */
  public async swapToNos(amount: number, source: SourceToken): Promise<string> {
    let inputMint = this.sourceMints[source];
    if (!inputMint) {
      throw new Error(`${source} is not available on ${this.config.network}`);
    }

    const quote = await this.requestQuote(amount, inputMint, source);
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
    source: SourceToken,
  ): Promise<QuoteResponse> {
    const { nos_address: outputMint } = this.config;
    // Convert source amount to its atomic amount (SOL 9, USDC/USDT 6)
    const decimals = source === 'SOL' ? 9 : 6;
    const inputAmountRaw = Math.floor(amount * Math.pow(10, decimals)).toString();

    const quoteResponse = await (
      await fetch(
        `https://lite-api.jup.ag/swap/v1/quote?${new URLSearchParams({
          inputMint,
          outputMint, // NOS mint
          swapMode: 'ExactIn',
          amount: inputAmountRaw.toString(),
          slippageBps: '50',
          restrictIntermediateTokens: 'true',
        }).toString()}`,
      )
    ).json();

    // Check quote response
    if (quoteResponse.error) {
      throw new Error(`Jupiter quote error: ${quoteResponse.error}`);
    }
    if (!quoteResponse.outAmount) {
      throw new Error(
        `No valid quote found. amount=${inputAmountRaw} inputMint=${inputMint} outputMint=${this.config.nos_address}`,
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

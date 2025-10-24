import { Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { QueryClient } from '../../../client/index.js';
import { SolanaConfig } from '../../../client.js';
import { createConnection } from '../../../utils.js';
import { vaultTopup } from './actions/vaultTopup.js';
import { vaultGetBalance, vaultWithdraw } from './actions/index.js';

import { TopupVaultOptions, Vault } from '../types.js';

interface CreateVaultOptions {
  wallet: Wallet;
  client: QueryClient;
  solanaConfig: SolanaConfig;
}

export function createVault(
  publicKey: PublicKey,
  { client, wallet, solanaConfig }: CreateVaultOptions,
): Vault {
  const { network, nos_address } = solanaConfig;
  const connection = createConnection(network);

  /**
   * @throws Error if the vault is not initialized
   * @throws Error if there is an error fetching the balance
   * @returns Promise<{ SOL: number; NOS: number }>
   * @description Fetches the balance of the vault in SOL and NOS.
   * It updates the balance in the backend and returns the current balance.
   */
  const getBalance = async (): Promise<{ SOL: number; NOS: number }> => {
    return await vaultGetBalance(publicKey, {
      connection,
      nos_address,
    });
  };

  /**
   * @throws Error if there is an error topping up the vault
   * @returns Promise<void>
   * @description Toppings up the vault with SOL and NOS.
   * It uses the TokenManager to add the specified amounts to the vault.
   */
  const topup = async ({
    SOL = 0,
    NOS = 0,
    lamports = false,
  }: TopupVaultOptions) => {
    return await vaultTopup(
      publicKey,
      wallet,
      { SOL, NOS, lamports },
      { nos_address, connection },
    );
  };

  /**
   * @throws Error if there is an error withdrawing from the vault
   * @returns Promise<void>
   * @description Withdraws all tokens from the vault.
   * It sends a transaction to withdraw the SOL and NOS from the vault.
   */
  const withdraw = async () => {
    await vaultWithdraw(publicKey, wallet, { client, connection });
  };

  return {
    publicKey,
    getBalance,
    topup,
    withdraw,
  };
}

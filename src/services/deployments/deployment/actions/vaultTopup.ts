import { Wallet } from '@coral-xyz/anchor';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

import { TopupVaultOptions } from '../createVault.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';
import { TokenManager } from '../../../../classes/tokenManager/index.js';

interface VaultTopupOptions {
  nos_address: string;
  connection: Connection;
}

/**
 * @throws Error if there is an error topping up the vault
 * @returns Promise<void>
 * @description Toppings up the vault with SOL and NOS.
 * It uses the TokenManager to add the specified amounts to the vault.
 */
export async function vaultTopup(
  publicKey: PublicKey,
  wallet: Wallet,
  { SOL = 0, NOS = 0, lamports = false }: TopupVaultOptions,
  { nos_address, connection }: VaultTopupOptions,
): Promise<void> {
  const manager = new TokenManager(
    wallet.publicKey,
    publicKey,
    'SOURCE',
    nos_address,
    connection,
  );

  try {
    if (NOS > 0) {
      await manager.addNOS(lamports ? NOS : NOS * 1e6);
    }

    if (SOL > 0) {
      await manager.addSOL(lamports ? SOL : SOL * LAMPORTS_PER_SOL);
    }

    await manager.transfer([wallet.payer]);
  } catch (e) {
    throw errorFormatter('Failed to topup vault.', {
      error: (e as Error).message,
    });
  }
}

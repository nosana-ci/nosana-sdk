import { Request, NextFunction } from 'express';

import { VaultsResponse } from '../../../../types';
import { ErrorsMessages } from '../../../../definitions/errors';

export async function getVaultMiddleware(
  req: Request<{ vault: string }>,
  res: VaultsResponse,
  next: NextFunction,
): Promise<void> {
  const { db } = res.locals;
  const vaultId = req.params.vault;
  const userId = req.headers['x-user-id'] as string;

  try {
    const vault = await db.vaults.findOne({
      vault: vaultId,
      owner: userId,
    });

    if (vault === null) {
      res.status(404).json({ error: ErrorsMessages.vaults.NOT_FOUND });
      return;
    }

    res.locals.vault = vault;
    next();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: ErrorsMessages.generic.SOMETHING_WENT_WRONG });
  }
}

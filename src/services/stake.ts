import { utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';
import { SolanaManager } from './solana.js';
import * as anchor from '@coral-xyz/anchor';
//@ts-ignore
const { BN } = anchor.default ? anchor.default : anchor;
import { PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const SECONDS_PER_DAY = 24 * 60 * 60;

export class Stake extends SolanaManager {
  /**
   * Function to fetch stake accounts from chain
   */
  async all() {
    await this.loadNosanaStake();
    // @ts-ignore
    return await this.stake!.program.account.stakeAccount.all();
  }

  /**
   * Function to fetch a stake account from chain
   * @param address
   */
  async get(address: PublicKey | string): Promise<any> {
    if (typeof address === 'string') address = new PublicKey(address);
    await this.loadNosanaStake();
    const [stakeAddress] = await PublicKey.findProgramAddress(
      [
        utf8.encode('stake'),
        new PublicKey(this.config.nos_address).toBuffer(),
        address.toBuffer(),
      ],
      new PublicKey(this.config.stake_address),
    );
    // @ts-ignore
    const stake = await this.stake!.program.account.stakeAccount.fetch(
      stakeAddress,
    );
    return stake;
  }

  /**
   * Create a stake account
   * @param address NOS Token account
   * @param amount amount
   * @param unstakeDays unstake period
   * @returns
   */
  async create(address: PublicKey, amount: number, unstakeDays: number) {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    const stakeDurationSeconds = unstakeDays * SECONDS_PER_DAY;
    const stakeAmount = amount;

    try {
      const mint = new PublicKey(this.config.nos_address);
      const ata = await getAssociatedTokenAddress(mint, address);

      const [vault] = await PublicKey.findProgramAddress(
        [utf8.encode('vault'), mint.toBuffer(), address.toBuffer()],
        new PublicKey(this.config.stake_address),
      );

      const [stake] = await PublicKey.findProgramAddress(
        [utf8.encode('stake'), mint.toBuffer(), address.toBuffer()],
        new PublicKey(this.config.stake_address),
      );

      return await this.stake!.program?.methods.stake(
        new BN(stakeAmount),
        new BN(stakeDurationSeconds),
      )
        .accounts({
          ...this.accounts,
          mint,
          user: ata,
          vault: vault,
          stake: stake,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong while creating stake account');
    }
  }

  /**
   * Topup stake
   * @param stakeAmount
   * @returns
   */
  async topup(stakeAmount: number) {
    try {
      await this.loadNosanaStake();
      await this.setStakeAccounts();

      if (this.stakeAccounts && this.poolAccounts) {
        const preInstructions = [];
        console.log('this.poolAccounts', this.poolAccounts);
        console.log('this.stakeAccounts', this.stakeAccounts);

        const rewardsInfo = await this.getRewardsInfo();

        // if reward account doesn't exists yet, create it
        if (!rewardsInfo || !rewardsInfo.account) {
          preInstructions.push(
            await this.stake!.rewardsProgram.methods.enter()
              .accounts(this.stakeAccounts)
              .instruction(),
          );
        }
        preInstructions.push(
          await this.stake!.poolsProgram.methods.claimFee()
            .accounts(this.poolAccounts)
            .instruction(),
        );

        console.log('rewardsAndPool', rewardsInfo);
        console.log('this.stakeAccounts', this.stakeAccounts);
        console.log('vault:', rewardsInfo?.vault);

        const response = await this.stake!.program?.methods.topup(
          new anchor.BN(stakeAmount),
        )
          .accounts(this.stakeAccounts)
          .preInstructions(preInstructions)
          .postInstructions([
            await this.stake!.rewardsProgram.methods.sync()
              .accounts({ ...this.stakeAccounts, vault: rewardsInfo?.vault })
              .instruction(),
          ])
          .rpc();
        console.log(response);
        return response;
      } else {
        throw new Error('Stake accounts not found');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong extending with topup: ' + error);
    }
  }

  /**
   * Extend existing stake
   * @param stakeDurationSeconds
   * @returns
   */
  async extend(stakeDurationSeconds: number) {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    if (this.stakeAccounts && this.poolAccounts) {
      try {
        const response = await this.stake!.program?.methods.extend(
          new anchor.BN(stakeDurationSeconds),
        )
          .accounts(this.stakeAccounts)
          .preInstructions([
            await this.stake!.poolsProgram.methods.claimFee()
              .accounts(this.poolAccounts)
              .instruction(),
          ])
          .postInstructions([
            await this.stake!.rewardsProgram.methods.sync()
              .accounts({
                ...this.stakeAccounts,
                vault: this.poolAccounts.rewardsVault,
              })
              .instruction(),
          ])
          .rpc();

        console.log(response);
        return response;
      } catch (error) {
        console.error(error);
        throw new Error('Something went wrong extending the stake');
      }
    } else {
      throw new Error('Stake accounts not found');
    }
  }

  /**
   * Unstake
   * @returns
   */
  async unstake() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();
    const preInstructions: any = [];

    if (this.stakeAccounts && this.poolAccounts) {
      // check if user has has reward account
      try {
        const rewardAccount = (
          await this.stake!.rewardsProgram.account.rewardAccount.fetch(
            this.stakeAccounts.reward,
          )
        ).reflection;
        console.log('User has reward account', rewardAccount);
        preInstructions.push(
          await this.stake!.poolsProgram.methods.claimFee()
            .accounts(this.poolAccounts)
            .instruction(),
          await this.stake!.rewardsProgram.methods.claim()
            .accounts({
              ...this.stakeAccounts,
              vault: this.poolAccounts.rewardsVault,
            })
            .instruction(),
          await this.stake!.rewardsProgram.methods.close()
            .accounts(this.stakeAccounts)
            .instruction(),
        );
      } catch (error) {
        // @ts-ignore
        if (error.message.includes('Account does not exist')) {
          console.log(error);
          throw new Error('Something went wrong while unstaking');
        }
      }

      try {
        const response = await this.stake!.program?.methods.unstake()
          .accounts(this.stakeAccounts)
          .preInstructions(preInstructions)
          .rpc();
        console.log(response);
        return response;
      } catch (error) {
        console.log(error);
        throw new Error('Something went wrong while unstaking');
      }
    } else {
      throw new Error('Stake accounts not found');
    }
  }

  /**
   * Restake
   * @returns
   */
  async restake() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    try {
      if (this.stakeAccounts) {
        const response = await this.stake!.program?.methods.restake()
          .accounts(this.stakeAccounts)
          .preInstructions([
            await this.stake!.poolsProgram.methods.claimFee()
              .accounts(this.poolAccounts)
              .instruction(),
          ])
          .postInstructions([
            await this.stake!.rewardsProgram.methods.enter()
              .accounts(this.stakeAccounts)
              .instruction(),
          ])
          .rpc();
        console.log(response);
        return response;
      } else {
        throw Error('Stake accounts not found');
      }
    } catch (error) {
      console.log(error);
      throw new Error('Something went wrong while restaking');
    }
  }

  /**
   * Close stake
   * @returns
   */
  async close() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    if (this.stakeAccounts) {
      try {
        const withdraw = await this.stake!.program?.methods.withdraw()
          .accounts(this.stakeAccounts)
          .rpc();
        console.log(withdraw);
        const response = await this.stake!.program?.methods.close()
          .accounts(this.stakeAccounts)
          .rpc();
        console.log(response);
        return [withdraw, response];
      } catch (error) {
        console.error(error);
        throw new Error('Something went wrong while closing');
      }
    } else {
      throw new Error('Staking accounts not found');
    }
  }

  /**
   * Withdraw
   * @returns
   */
  async withdraw() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    if (this.stakeAccounts && this.poolAccounts) {
      try {
        const response = await this.stake!.program?.methods.withdraw()
          .accounts(this.stakeAccounts)
          .rpc();
        console.log(response);
        return response;
      } catch (error) {
        console.error(error);
        throw new Error('Something went wrong while withdrawing');
      }
    } else {
      throw new Error('Staking accounts not found');
    }
  }

  /**
   * Claim staking rewards
   * @returns tx hash
   */
  async claimRewards() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    if (this.stakeAccounts && this.poolAccounts) {
      try {
        const response = await this.stake!.rewardsProgram?.methods.claim()
          .accounts({
            ...this.stakeAccounts,
            vault: this.poolAccounts.rewardsVault,
          })
          .preInstructions([
            await this.stake!.poolsProgram?.methods.claimFee()
              .accounts(this.poolAccounts)
              .instruction(),
          ])
          .rpc();
        console.log(response);
        return response;
      } catch (error) {
        console.error(error);
        throw new Error('Something went wrong while withdrawing');
      }
    } else {
      throw new Error('accounts not found');
    }
  }

  /**
   * Claim stake and Restake
   * @param amount amount to restake
   * @returns tx hash
   */
  async claimAndRestakeRewards(amount: number) {
    if (this.stakeAccounts && this.poolAccounts) {
      try {
        const decimals = 1e6;
        const stakeAmount = amount * decimals;
        console.log('stakeAmount', stakeAmount);
        const response = await this.stake!.rewardsProgram?.methods.claim()
          .accounts({
            ...this.stakeAccounts,
            vault: this.poolAccounts.rewardsVault,
          })
          .preInstructions([
            await this.stake!.poolsProgram?.methods.claimFee()
              .accounts(this.poolAccounts)
              .instruction(),
          ])
          .postInstructions([
            await this.stake!.program?.methods.topup(new anchor.BN(stakeAmount))
              .accounts(this.stakeAccounts)
              .instruction(),
            await this.stake!.rewardsProgram.methods.sync()
              .accounts({
                ...this.stakeAccounts,
                vault: this.poolAccounts.rewardsVault,
              })
              .instruction(),
          ])
          .rpc();
        console.log(response);
        return response;
      } catch (error) {
        console.error(error);
        throw new Error('Something went wrong while withdrawing');
      }
    } else {
      throw new Error('accounts not found');
    }
  }

  /**
   * Get staking pool info
   * @returns Object
   */
  async getPoolInfo() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    if (!this.stakeAccounts || !this.poolAccounts) {
      return null;
    }
    let pool, poolBalance;

    try {
      pool = await this.stake!.poolsProgram.account.poolAccount.fetch(
        new PublicKey(this.config.pool_address),
      );
      poolBalance = await this.getNosBalance(this.poolAccounts.vault);
    } catch (error: any) {
      throw new Error(error.message);
    }
    if (poolBalance) {
      pool.poolBalance = poolBalance.uiAmount;
    }
    return pool;
  }

  /**
   * Get rewards info
   * @returns Object
   */
  async getRewardsInfo() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    if (!this.stakeAccounts) {
      return null;
    }
    const globalReflection =
      await this.stake!.rewardsProgram.account.reflectionAccount.fetch(
        this.stakeAccounts.reflection,
      );
    let rewardAccount, rewardVault;

    try {
      rewardAccount =
        await this.stake!.rewardsProgram.account.rewardAccount.fetch(
          this.stakeAccounts.reward,
        );
      rewardVault = await PublicKey.findProgramAddress(
        [new PublicKey(this.config.nos_address).toBuffer()],
        new PublicKey(this.config.rewards_address),
      );
    } catch (error: any) {
      if (!error.message.includes('Account does not exist')) {
        throw new Error(error.message);
      } else {
        console.log('Reward account does not exists, skip');
      }
    }
    const rewardInfo = {
      global: globalReflection,
      account: rewardAccount,
      vault: rewardVault,
    };
    return rewardInfo;
  }

  /**
   * Get NOS balance of stake vault
   * @returns
   */
  async getStakeVaultBalance() {
    await this.loadNosanaStake();
    await this.setStakeAccounts();
    if (!this.stakeAccounts) {
      return null;
    }

    const balance = await this.getNosBalance(this.stakeAccounts.vault);
    let uiBalance;
    if (balance) {
      uiBalance = balance.uiAmount;
    }
    console.log('balance', balance);
    return uiBalance;
  }
}

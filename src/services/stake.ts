import { utf8 } from '@coral-xyz/anchor/dist/cjs/utils/bytes/index.js';
import { SolanaManager } from './solana.js';
import * as anchor from '@coral-xyz/anchor';
const { BN } = anchor;
import { PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const SECONDS_PER_DAY = 24 * 60 * 60;

export class Stake extends SolanaManager {
  constructor(...args: any) {
    super(...args);
  }

  /**
   * Function to fetch stake accounts from chain
   */
  async all() {
    await this.loadNosanaStake();
    // @ts-ignore
    return await this.stake!.account.stakeAccount.all();
  }

  /**
   * Create a stake account
   * @param address NOS Token account
   * @param amount amount in whole NOS
   * @param unstakeDays unstake period
   * @returns
   */
  async create(address: PublicKey, amount: number, unstakeDays: number) {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    const stakeDurationSeconds = unstakeDays * SECONDS_PER_DAY;
    const decimals = 1e6;
    const stakeAmount = amount * decimals;

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

      return await this.stake!.program.methods.stake(
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
   * Extend existing stake
   * @param stakeDurationSeconds 
   * @returns 
   */
  async extend (stakeDurationSeconds: number) {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    try {
      const response = await this.stake!.program.methods
        .extend(new anchor.BN(stakeDurationSeconds))
        .accounts(this.stakeAccounts)
        .preInstructions([
          await this.stake!.poolsProgram.methods
            .claimFee()
            .accounts(this.poolAccounts).instruction()
        ])
        .postInstructions([
          await this.stake!.rewardsProgram.methods
            .sync().accounts({ ...this.stakeAccounts, vault: this.poolAccounts.rewardsVault }).instruction()])
        .rpc();

      console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong extending the stake');
    }
  };

  /**
   * Unstake
   * @returns 
   */
  async unstake () {
    await this.loadNosanaStake();
    await this.setStakeAccounts();
    // check if user has has reward account
    const preInstructions = [];
    try {
      const rewardAccount = (
        await this.stake!.rewardsProgram.account.rewardAccount.fetch(this.stakeAccounts.reward)).reflection;
      console.log('User has reward account', rewardAccount);
      preInstructions.push(
        await this.stake!.poolsProgram.methods
          .claimFee()
          .accounts(this.poolAccounts).instruction(),
        await this.stake!.rewardsProgram.methods
          .claim()
          .accounts({ ...this.stakeAccounts, vault: this.poolAccounts.rewardVault }).instruction(),
        await this.stake!.rewardsProgram.methods.close().accounts(this.stakeAccounts).instruction()
      );
    } catch (error) {
      // @ts-ignore
      if (error.message.includes('Account does not exist')) {
        console.log(error);
        throw new Error('Something went wrong while restaking');
      }
    }

    try {
      const response = await this.stake!.program.methods
        .unstake()
        .accounts(this.stakeAccounts)
        .preInstructions(preInstructions)
        .rpc();
      console.log(response)
      return response;
    } catch (error) {
      console.log(error);
      throw new Error('Something went wrong while unstaking');
    }
  }

  /**
   * Restake
   * @returns
   */
  async restake () {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    try {
      const response = await this.stake!.program.methods
        .restake()
        .accounts(this.stakeAccounts)
        .preInstructions([
          await this.stake!.poolsProgram.methods
            .claimFee()
            .accounts(this.poolAccounts).instruction()
        ])
        .postInstructions(
          [await this.stake!.rewardsProgram.methods.enter().accounts(this.stakeAccounts).instruction()])
        .rpc();
      console.log(response);
      return response;
    } catch (error) {
      console.log(error);
      throw new Error('Something went wrong while restaking');
    }
  }

  /**
   * Close stake
   * @returns 
   */
  async close () {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    try {
      const withdraw = await this.stake!.program.methods
        .withdraw()
        .accounts(this.stakeAccounts)
        .rpc();
      console.log(withdraw);
      const response = await this.stake!.program.methods
        .close()
        .accounts(this.stakeAccounts)
        .rpc();
      console.log(response);
      return [withdraw, response]
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong while closing');
    }
  }

  /**
   * Withdraw
   * @returns 
   */
  async withdraw () {
    await this.loadNosanaStake();
    await this.setStakeAccounts();

    try {
      const response = await this.stake!.program.methods
        .withdraw()
        .accounts(this.stakeAccounts)
        .rpc();
      console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong while withdrawing');
    }
  }
}

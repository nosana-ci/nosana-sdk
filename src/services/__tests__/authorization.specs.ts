import { PublicKey } from '@solana/web3.js';
import { AuthorizationManager } from '../authorization';

describe('AuthorizationManager', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-12-16'));
  });

  afterEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-12-16'));
  });

  const authorizationManager = new AuthorizationManager(
    process.env.JEST_SOLANA_WALLET as string,
  );

  describe('generate', () => {
    it('should generate a validation string', () => {
      expect(authorizationManager.generate('validationString')).toBe(
        'validationString:4hEXBxCVbFm6uPYScs5k24UcqpqHpTh4XrxrArg7uW57LW3i5e7WPJdZyYgL5nzacxYEHjywpbrL4Dq1ryHaC2ot',
      );
    });

    test('when includeTime is true and seperator is +, should return validation string with time and + seperator', () => {
      expect(
        authorizationManager.generate('validationStringWithOpts', {
          includeTime: true,
          seperator: '+',
        }),
      ).toBe(
        'validationStringWithOpts+4EsfLjmGevLsN2VRHFMdW5u7xRBGca4Pwe9fwNz6pQf5LDF5AZ8jNeArz46euTEydUyYdcS4FRH6HdwEFzgHxMz+1734307200000',
      );
    });
  });

  describe('generateHeader', () => {
    it('should generate authorization header', () => {
      const header = authorizationManager.generateHeader('headerMessage');

      expect(header.get('Authorization')).toBe(
        'headerMessage:2k4iSPKEdeKqWPuqhEt4miM17MjPxEDsjpqmE21EVuKM2oo8HwbrtX2UybLJv18FLYWyg9vumxwjzHx6p88Y5nRE',
      );
    });

    test('when includeTime is true and key is set, should generate headers with string and time', () => {
      const header = authorizationManager.generateHeader(
        'headerMessageWithTime',
        {
          key: 'X-Session-Id',
          includeTime: true,
        },
      );

      expect(header.get('X-Session-Id')).toBe(
        'headerMessageWithTime:4aEr7gDhNdbnpVYkGeiQLpmqCCqbJ2e41pvPSVWcZjTjMxyp4BzecwkchHp6iiHZjGr7Kn9aCawgQY7WFHQqDU9j:1734307200000',
      );
    });
  });

  describe('validate', () => {
    it('should validate authication', () => {
      expect(
        authorizationManager.validate(
          'validationString:4hEXBxCVbFm6uPYScs5k24UcqpqHpTh4XrxrArg7uW57LW3i5e7WPJdZyYgL5nzacxYEHjywpbrL4Dq1ryHaC2ot',
        ),
      ).toBeTruthy();
    });

    it('should validate with expiry', () => {
      expect(
        authorizationManager.validate(
          'validationStringWithOpts+4EsfLjmGevLsN2VRHFMdW5u7xRBGca4Pwe9fwNz6pQf5LDF5AZ8jNeArz46euTEydUyYdcS4FRH6HdwEFzgHxMz+1734307200000',
          {
            seperator: '+',
          },
        ),
      ).toBeTruthy();
    });

    it('should validate with expiry', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-12-16:00:05:00'));

      let msg: string = '';

      try {
        authorizationManager.validate(
          'validationStringWithOpts+4EsfLjmGevLsN2VRHFMdW5u7xRBGca4Pwe9fwNz6pQf5LDF5AZ8jNeArz46euTEydUyYdcS4FRH6HdwEFzgHxMz+1734307200000',
          {
            seperator: '+',
          },
        );
      } catch (e) {
        msg = (e as Error).message;
      }

      expect(msg).toBe('Authorization has expired.');
    });

    describe('when using a different wallet', () => {
      const manager = new AuthorizationManager(
        process.env.JEST_WRONG_SOLANA_WALLET as string,
      );

      it('should not validate', () => {
        expect(
          manager.validate(
            'validationString:4hEXBxCVbFm6uPYScs5k24UcqpqHpTh4XrxrArg7uW57LW3i5e7WPJdZyYgL5nzacxYEHjywpbrL4Dq1ryHaC2ot',
          ),
        ).toBeFalsy();
      });

      test('when passing in the correct wallet, should be able to validate', () => {
        expect(
          manager.validate(
            'validationString:4hEXBxCVbFm6uPYScs5k24UcqpqHpTh4XrxrArg7uW57LW3i5e7WPJdZyYgL5nzacxYEHjywpbrL4Dq1ryHaC2ot',
            {
              publicKey: new PublicKey(
                process.env.JEST_SOLANA_WALLET_PUBLIC_KEY as string,
              ),
            },
          ),
        ).toBeTruthy();
      });
    });
  });
});

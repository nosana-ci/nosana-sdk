import { Client, sleep } from '../../src';

(async () => {
  try {
    const API_KEY = '<TOKEN>';

    const client = new Client('devnet', undefined, {
      apiKey: API_KEY,
      // apiJobs: { backend_url: 'http://localhost:3000' },
    });

    // Fetch and print credit balance
    const balance = await client.apiJobs!.balance();
    console.log(`Balance available: $${(balance.assignedCredits - balance.reservedCredits - balance.settledCredits).toFixed(2)}`);

    console.log('\nCreating job...');
    const jobDefinition = {
      version: '0.1',
      type: 'container',
      ops: [
        {
          type: 'container/run',
          id: 'hello-world',
          args: { image: 'ubuntu', cmd: 'echo hello from api jobs; sleep 1500;' },
        },
      ],
    };

    const ipfsHash = await client.ipfs.pin(jobDefinition);
    console.log('Pinned job to IPFS:', client.ipfs.config.gateway + ipfsHash);

    // Create a job using credits
    const market = 'DfJJiNU3siRQUz2a67tqoY72fUzwR8MhBEMBGK85SwAr';
    const listResp = await client.apiJobs!.list({
      ipfsHash,
      market,
      timeout: 1800, // 30 minutes
    });
    console.log('Created job:', listResp);

    // await sleep(5);

    // Extend the job
    // const extendResp = await client.apiJobs!.extend({
    //   jobAddress: listResp.jobAddress,
    //   extensionSeconds: 60, // +1 minute
    // });
    // console.log('Extended job:', extendResp);

    // // // Stop the job
    // const stopResp = await client.apiJobs!.stop({ jobAddress: listResp.jobAddress });
    // console.log('Stopped job:', stopResp);
  } catch (e) {
    console.error('Example failed:', e);
    process.exit(1);
  }
})();



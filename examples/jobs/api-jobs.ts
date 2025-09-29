import { Client, sleep } from '../../src';

(async () => {
  try {
    const API_KEY = '<TOKEN>';

    const client = new Client('mainnet', undefined, {
      apiKey: API_KEY,
    });

    // Fetch and print credit balance
    const balance = await client.api.credits.balance();
    console.log(`Balance available: $${(balance.assignedCredits - balance.reservedCredits - balance.settledCredits).toFixed(2)}`);
    console.log('\nCreating job...');
    const jobDefinition = {
      version: '0.1',
      type: 'container',
      ops: [
        {
          type: 'container/run',
          id: 'hello-world',
          args: {
            image: 'ubuntu',
            cmd: 'for i in `seq 1 30`; do echo $i; sleep 1; done',
          },
        },
      ],
    };
    const ipfsHash = await client.ipfs.pin(jobDefinition);
    console.log('Pinned job to IPFS:', client.ipfs.config.gateway + ipfsHash);

    // Create a job using credits
    // You can find the market addresses on the Nosana dashboard
    const market = '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq'; // NVIDIA 3060
    const listResp = await client.api.jobs.list({
      ipfsHash,
      market,
      timeout: 1800, // 30 minutes
    });
    console.log('Created job:', listResp);

    // await sleep(5);

    // // Extend the job
    // const extendResp = await client.api.jobs.extend({
    //   jobAddress: listResp.jobAddress,
    //   extensionSeconds: 60, // +1 minute
    // });
    // console.log('Extended job:', extendResp);

    // // // Stop the job
    // const stopResp = await client.api.jobs.stop({ jobAddress: listResp.jobAddress });
    // console.log('Stopped job:', stopResp);
  } catch (e) {
    console.error('Example failed:', e);
    process.exit(1);
  }
})();



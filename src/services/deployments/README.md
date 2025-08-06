# Deployments Service

The Deployments service provides functionality to create, manage, and interact with deployments on the Nosana network. It allows you to deploy applications with configurable replicas, timeouts, and strategies.

## Overview

Deployments enable you to run containerized applications on the Nosana distributed computing network. Each deployment consists of:

- **Container Definition**: Specified via IPFS hash containing the job definition
- **Market**: The Solana public key of the compute market where the deployment runs
- **Replicas**: Number of instances to run
- **Strategy**: Deployment strategy (SIMPLE, SIMPLE-EXTEND, SCHEDULED, INFINITE)
- **Timeout**: Maximum execution time per job instance

## Quick Start

```typescript
import { Client } from '@nosana/sdk';

// Initialize the client
const client = new Client('devnet', wallet);

// Pin your job definition to IPFS
const ipfsHash = await client.jobs.pinJobDefinition(jobDefinition);

// Create a deployment
const deployment = await client.deployments.create({
  name: 'My Application',
  market: '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq',
  replicas: 3,
  timeout: 300,
  strategy: 'SIMPLE',
  ipfs_definition_hash: ipfsHash,
});

console.log('Deployment created:', deployment.state.id);
```

## API Reference

### Creating a Deployment

```typescript
const deployment = await client.deployments.create({
  name: string;              // Human-readable name
  market: string;            // Solana public key of the compute market
  replicas: number;          // Number of instances to run
  timeout: number;           // Timeout in seconds
  strategy: DeploymentStrategy; // Deployment strategy
  ipfs_definition_hash: string; // IPFS hash of job definition
});
```

### Deployment Strategies

- **SIMPLE**: Runs the specified number of replicas once. Stops when all instances complete.
- **SIMPLE-EXTEND**: Similar to SIMPLE but can be extended with additional replicas after completion.
- **SCHEDULED**: Runs deployments on a predefined schedule.
- **INFINITE**: **NOT YET IMPLEMENTED** Continuously maintains the specified number of replicas, restarting instances as they complete.

### Deployment Status

- **DRAFT**: Initial state, not yet started
- **STARTING**: Deployment is initializing
- **RUNNING**: Active and processing jobs
- **STOPPING**: Gracefully shutting down
- **STOPPED**: Stopped but can be restarted
- **ARCHIVED**: Permanently archived (cannot be restarted)
- **ERROR**: Encountered an error
- **INSUFFICIENT_FUNDS**: Not enough funds in vault to continue

### Listing Deployments

```typescript
const deployments = await client.deployments.list();
```

### Getting a Specific Deployment

```typescript
const deployment = await client.deployments.get('deployment-id');
```

## Deployment Object

Once created, a deployment object provides several methods for management:

### State Management

```typescript
// Start the deployment
await deployment.start();

// Stop the deployment
await deployment.stop();

// Archive the deployment (permanent)
await deployment.archive();
```

### Configuration Updates

```typescript
// Update replica count
await deployment.updateReplicas(5);

// Update timeout
await deployment.updateTimeout(600);
```

### Monitoring

```typescript
// Get current tasks
const tasks = await deployment.getTasks();
```

### Vault Management

Deployments include a vault for managing funds:

```typescript
// Get vault balance
const balance = await deployment.vault.getBalance();

// Top up the vault
await deployment.vault.topup({ SOL, 1, NOS: 10 });

// Withdraw from vault
await deployment.vault.withdraw();
```

### Using the Pipe Function

The `pipe` function allows you to chain multiple actions on a deployment in a functional programming style. It can either create a new deployment or operate on an existing one.

```typescript
// Create and execute multiple actions in sequence
const deployment = await client.deployments.pipe(
  {
    name: 'My Application',
    market: '7AtiXMSH6R1jjBxrcYjehCkkSF7zvYWte63gwEDBcGHq',
    replicas: 3,
    timeout: 300,
    strategy: 'SIMPLE',
    ipfs_definition_hash: ipfsHash,
  },
  async (deployment) => {
    console.log('Topping up vault');
    await deployment.vault.topup({ SOL: 0.01, NOS: 1 });
  },
  async (deployment) => {
    console.log('Starting deployment');
    await deployment.start();
  },
  async (deployment) => {
    console.log('Updating replicas');
    await deployment.updateReplicas(5);
  },
);

// Or operate on an existing deployment
const deployment = await client.deployments.pipe(
  'existing-deployment-id',
  async (deployment) => {
    await deployment.stop();
  },
  async (deployment) => {
    await deployment.vault.withdraw();
  },
);
```

## Error Handling

```typescript
try {
  const deployment = await client.deployments.create(deploymentConfig);
} catch (error) {
  if (error.message.includes('Insufficient funds')) {
    // Handle funding issues
    console.log('Need to add more funds to wallet');
  } else {
    // Handle other errors
    console.error('Deployment creation failed:', error);
  }
}
```

## Configuration

Deployments can be configured with custom settings:

```typescript
const client = new Client('devnet', wallet, {
  solana: {
    network: 'https://api.mainnet-beta.solana.com',
  },
  deployments: {
    endpoint: 'https://deployment-manager.k8s.prd.nos.ci',
  },
});
```

## Support

For additional help or questions about deployments:

- Check the main SDK documentation
- Review example implementations in the `/examples` directory
- Consult the Nosana documentation for market-specific requirements

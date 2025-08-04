# Deployments Service

The Deployments service provides functionality to create, manage, and interact with containerized application deployments on the Nosana network. It allows you to deploy applications with configurable replicas, timeouts, and strategies.

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

// Access deployment state
console.log(deployment.state.status); // Current status
console.log(deployment.state.events); // Event history
console.log(deployment.state.jobs); // Associated jobs
```

### Vault Management

Deployments include a vault for managing funds:

```typescript
// Get vault balance
const balance = await deployment.vault.getBalance();

// Top up the vault
await deployment.vault.topup(1000000); // Amount in lamports

// Withdraw from vault
await deployment.vault.withdraw(500000);
```

## Deployment Strategies

### SIMPLE

Runs the specified number of replicas once. Stops when all instances complete.

### SIMPLE-EXTEND

Similar to SIMPLE but can be extended with additional replicas after completion.

### SCHEDULED

Runs deployments on a predefined schedule.

### INFINITE

Continuously maintains the specified number of replicas, restarting instances as they complete.

## Deployment Status

Deployments progress through various states:

- **DRAFT**: Initial state, not yet started
- **STARTING**: Deployment is initializing
- **RUNNING**: Active and processing jobs
- **STOPPING**: Gracefully shutting down
- **STOPPED**: Stopped but can be restarted
- **ARCHIVED**: Permanently archived (cannot be restarted)
- **ERROR**: Encountered an error
- **INSUFFICIENT_FUNDS**: Not enough funds in vault to continue

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

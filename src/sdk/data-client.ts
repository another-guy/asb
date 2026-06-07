import { ServiceBusClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';

import type { AsbContext } from '../auth/types.js';

export function createDataClient(ctx: AsbContext): ServiceBusClient {
  if ('connectionString' in ctx) {
    return new ServiceBusClient(ctx.connectionString);
  }
  return new ServiceBusClient(ctx.namespace, new DefaultAzureCredential());
}

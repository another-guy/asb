import { ServiceBusAdministrationClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';

import type { AsbContext } from '../auth/types.js';

export function createAdminClient(ctx: AsbContext): ServiceBusAdministrationClient {
  if ('connectionString' in ctx) {
    return new ServiceBusAdministrationClient(ctx.connectionString);
  }
  return new ServiceBusAdministrationClient(ctx.namespace, new DefaultAzureCredential());
}

// apps/server/src/schemas/webhook.schema.ts
import { z } from 'zod';

export const FlutterwaveWebhookCustomerSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone_number: z.string().nullable().optional(),
});

export const FlutterwaveWebhookDataSchema = z.object({
  id: z.union([z.number(), z.string()]),
  tx_ref: z.string(),
  flw_ref: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().default('NGN'),
  status: z.string(),
  customer: FlutterwaveWebhookCustomerSchema.optional(),
});

export const FlutterwaveWebhookPayloadSchema = z.object({
  event: z.string().default('charge.completed'),
  data: FlutterwaveWebhookDataSchema,
  'event.type': z.string().optional(),
});

export type FlutterwaveWebhookPayload = z.infer<typeof FlutterwaveWebhookPayloadSchema>;

export interface WebhookJobData {
  webhookEventId: string;
  provider: string;
  providerEventId: string;
  transactionId: string | number;
  txRef: string;
  amountInKobo: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  requestId?: string;
}


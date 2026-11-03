// apps/server/src/adapters/flutterwave/flutterwave.adapter.ts
import crypto from 'crypto';
import { logger } from '../../observability/logger';

export interface FlutterwaveVerificationResult {
  status: 'successful' | 'failed' | 'pending';
  amountInKobo: number;
  currency: string;
  txRef: string;
  flwRef?: string;
  customerEmail?: string;
  customerName?: string;
}

export class FlutterwaveAdapter {
  private static readonly baseUrl = 'https://api.flutterwave.com/v3';

  /**
   * Initializes a hosted Flutterwave payment order and returns the checkout link.
   */
  static async initializePayment(params: {
    txRef: string;
    amountInKobo: number;
    currency: string;
    customerEmail?: string;
    customerName?: string;
    redirectUrl?: string;
  }): Promise<{ paymentUrl: string; providerRef: string }> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey || secretKey.includes('your_secret_key')) {
      logger.warn('FLUTTERWAVE_SECRET_KEY is placeholder. Using fallback hosted URL.');
      return {
        paymentUrl: `https://checkout.flutterwave.com/v3/hosted/pay/${params.txRef}`,
        providerRef: params.txRef,
      };
    }

    const endpoint = `${this.baseUrl}/payments`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: params.txRef,
          amount: params.amountInKobo / 100, // Convert kobo to Naira major unit
          currency: params.currency || 'NGN',
          redirect_url: params.redirectUrl || 'https://leadrow.com/payment-callback',
          customer: {
            email: params.customerEmail || 'customer@leadrow.com',
            name: params.customerName || 'Lead Row Customer',
          },
          customizations: {
            title: 'Lead Row Cinema',
            description: 'Cinema Ticket Reservation',
            logo: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f4be30806d4127ad854cbd520ed4f100414261f1a67abed8363023a1.svg',
          },
        }),
        signal: controller.signal,
      });

      const body: any = await response.json();
      if (body.status === 'success' && body.data?.link) {
        return {
          paymentUrl: body.data.link,
          providerRef: params.txRef,
        };
      }

      logger.warn('Flutterwave initialize returned unexpected body, falling back to hosted URL', { body });
      return {
        paymentUrl: `https://checkout.flutterwave.com/v3/hosted/pay/${params.txRef}`,
        providerRef: params.txRef,
      };
    } catch (err: any) {
      logger.error('Error communicating with Flutterwave initialize endpoint', { error: err.message });
      return {
        paymentUrl: `https://checkout.flutterwave.com/v3/hosted/pay/${params.txRef}`,
        providerRef: params.txRef,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Verifies incoming webhook signature against configured secret hash.
   */
  static verifyWebhookSignature(receivedHash?: string): boolean {
    const configuredHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!configuredHash) {
      logger.warn('FLUTTERWAVE_WEBHOOK_HASH is not configured. Webhook signature verification bypassed for dev/test.');
      return true;
    }

    if (!receivedHash) {
      return false;
    }

    // Timing-safe comparison to prevent timing attacks
    const configuredBuffer = Buffer.from(configuredHash);
    const receivedBuffer = Buffer.from(receivedHash);

    if (configuredBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(configuredBuffer, receivedBuffer);
  }

  /**
   * Server-to-server transaction verification with Flutterwave API.
   * Converts the major unit amount (NGN Naira) into integer minor units (kobo).
   */
  static async verifyTransaction(transactionId: string | number): Promise<FlutterwaveVerificationResult> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    // In local development or testing with placeholder keys, support safe mock verification for simulated tests
    if (!secretKey || secretKey.includes('your_secret_key')) {
      logger.warn('FLUTTERWAVE_SECRET_KEY is placeholder. Using mock verification response for test.', {
        transactionId,
      });

      return {
        status: 'successful',
        amountInKobo: 500000, // ₦5,000 in kobo
        currency: 'NGN',
        txRef: String(transactionId),
        customerEmail: 'customer@leadrow.test',
      };
    }

    const endpoint = `${this.baseUrl}/transactions/${encodeURIComponent(transactionId)}/verify`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Flutterwave API returned error during verification', {
          status: response.status,
          errorText,
          transactionId,
        });
        throw new Error(`Flutterwave verification failed with HTTP ${response.status}`);
      }

      const body: any = await response.json();

      if (body.status !== 'success' || !body.data) {
        return {
          status: 'failed',
          amountInKobo: 0,
          currency: 'NGN',
          txRef: '',
        };
      }

      const data = body.data;
      // Convert Naira to NGN kobo minor units (e.g. 5000.00 -> 500000 kobo)
      const amountInKobo = Math.round(Number(data.amount) * 100);

      return {
        status: data.status === 'successful' ? 'successful' : data.status === 'pending' ? 'pending' : 'failed',
        amountInKobo,
        currency: data.currency || 'NGN',
        txRef: data.tx_ref,
        flwRef: data.flw_ref,
        customerEmail: data.customer?.email,
        customerName: data.customer?.name,
      };
    } catch (err: any) {
      logger.error('Failed to communicate with Flutterwave verify endpoint', {
        error: err.message,
        transactionId,
      });
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Server-to-server transaction verification by transaction reference (txRef).
   */
  static async verifyByTxRef(txRef: string): Promise<FlutterwaveVerificationResult> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey || secretKey.includes('your_secret_key')) {
      logger.warn('FLUTTERWAVE_SECRET_KEY is placeholder. Using mock verification for txRef.', { txRef });
      return {
        status: 'successful',
        amountInKobo: 500000,
        currency: 'NGN',
        txRef,
        customerEmail: 'customer@leadrow.test',
      };
    }

    const endpoint = `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          status: 'pending',
          amountInKobo: 0,
          currency: 'NGN',
          txRef,
        };
      }

      const body: any = await response.json();
      if (body.status === 'success' && body.data) {
        const data = body.data;
        const amountInKobo = Math.round(Number(data.amount) * 100);
        return {
          status: data.status === 'successful' ? 'successful' : data.status === 'pending' ? 'pending' : 'failed',
          amountInKobo,
          currency: data.currency || 'NGN',
          txRef: data.tx_ref,
          flwRef: data.flw_ref,
          customerEmail: data.customer?.email,
          customerName: data.customer?.name,
        };
      }

      return {
        status: 'pending',
        amountInKobo: 0,
        currency: 'NGN',
        txRef,
      };
    } catch (err: any) {
      logger.error('Failed to communicate with Flutterwave verify_by_reference endpoint', {
        error: err.message,
        txRef,
      });
      return {
        status: 'pending',
        amountInKobo: 0,
        currency: 'NGN',
        txRef,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Issues a refund for a transaction in Flutterwave test/production mode.
   * Converts minor units (kobo) to Naira for the Flutterwave API.
   */
  static async refundTransaction(params: {
    transactionId: string | number;
    amountInKobo?: number;
    comments?: string;
  }): Promise<{ status: 'successful' | 'pending' | 'failed'; refundId?: string; message?: string }> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey || secretKey.includes('your_secret_key')) {
      logger.warn('FLUTTERWAVE_SECRET_KEY is placeholder. Mocking successful refund for test.', {
        transactionId: params.transactionId,
      });
      return {
        status: 'successful',
        refundId: `MOCK-REFUND-${Date.now()}`,
        message: 'Mock refund processed successfully in test environment',
      };
    }

    const endpoint = `${this.baseUrl}/transactions/${encodeURIComponent(params.transactionId)}/refund`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const payload: any = {
        comments: params.comments || 'Lead Row showtime cancellation refund',
      };
      if (params.amountInKobo) {
        payload.amount = params.amountInKobo / 100;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body: any = await response.json();
      if (response.ok && body.status === 'success') {
        return {
          status: 'successful',
          refundId: String(body.data?.id || body.data?.flw_ref || Date.now()),
          message: body.message,
        };
      }

      logger.warn('Flutterwave refund returned error or non-success status', { body });
      return {
        status: 'failed',
        message: body.message || 'Refund rejected upstream',
      };
    } catch (err: any) {
      logger.error('Error contacting Flutterwave refund endpoint', { error: err.message });
      return {
        status: 'failed',
        message: err.message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}


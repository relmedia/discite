import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { LicenseType } from '@/infrastructure/database/entities/marketplace-course.entity';

export interface CreateCheckoutSessionParams {
  courseId: string;
  courseName: string;
  courseDescription?: string;
  price: number;
  currency: string;
  licenseType: LicenseType;
  seatCount?: number;
  durationMonths?: number;
  isSubscription: boolean;
  tenantId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private isConfigured: boolean = false;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.isConfigured = true;
    } else {
      console.warn('STRIPE_SECRET_KEY not configured. Payment features will be disabled.');
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
  }

  // Create a checkout session for course purchase
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    this.ensureConfigured();

    const metadata = {
      courseId: params.courseId,
      courseName: params.courseName,
      tenantId: params.tenantId,
      userId: params.userId,
      licenseType: params.licenseType,
      seatCount: params.seatCount?.toString() || '',
      durationMonths: params.durationMonths?.toString() || '',
    };

    let session: Stripe.Checkout.Session;

    if (params.isSubscription) {
      // Create subscription checkout
      session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: params.courseName,
                description: this.buildDescription(params),
              },
              unit_amount: Math.round(params.price * 100), // Stripe uses cents
              recurring: {
                interval: 'month', // Could be 'year' based on license option
              },
            },
            quantity: params.seatCount || 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata,
        subscription_data: {
          metadata,
        },
      });
    } else {
      // Create one-time payment checkout
      session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: params.courseName,
                description: this.buildDescription(params),
              },
              unit_amount: Math.round(params.price * 100),
            },
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata,
      });
    }

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  // Construct webhook event from request
  async constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): Promise<Stripe.Event> {
    this.ensureConfigured();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Webhook signature verification failed: ${message}`);
    }
  }

  // Retrieve checkout session
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    this.ensureConfigured();
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent'],
    });
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.ensureConfigured();
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.ensureConfigured();
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  // Create a product in Stripe (for marketplace courses)
  async createProduct(params: {
    name: string;
    description?: string;
    courseId: string;
  }): Promise<Stripe.Product> {
    this.ensureConfigured();
    return this.stripe.products.create({
      name: params.name,
      description: params.description,
      metadata: {
        courseId: params.courseId,
      },
    });
  }

  // Create a price for a product
  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    recurring?: {
      interval: 'month' | 'year';
    };
  }): Promise<Stripe.Price> {
    this.ensureConfigured();
    return this.stripe.prices.create({
      product: params.productId,
      unit_amount: params.unitAmount,
      currency: params.currency.toLowerCase(),
      recurring: params.recurring,
    });
  }

  // Check if Stripe is configured
  isStripeConfigured(): boolean {
    return this.isConfigured;
  }

  // Get payment history (checkout sessions) for a user
  async getPaymentHistory(userId: string, limit: number = 50): Promise<{
    id: string;
    paymentIntentId?: string;
    courseName: string;
    courseId?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    invoiceUrl?: string;
    receiptUrl?: string;
    refundable: boolean;
    refundDeadline?: Date;
  }[]> {
    this.ensureConfigured();

    // List checkout sessions and filter by userId in metadata
    const sessions = await this.stripe.checkout.sessions.list({
      limit: 100, // Fetch more to filter
    });

    const userSessions = sessions.data.filter(
      session => session.metadata?.userId === userId && session.payment_status === 'paid'
    );

    const payments = await Promise.all(
      userSessions.slice(0, limit).map(async (session) => {
        let invoiceUrl: string | undefined;
        let receiptUrl: string | undefined;
        let paymentIntentId: string | undefined;

        // Get receipt URL from payment intent
        if (session.payment_intent) {
          paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent.id;
            
          try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
              expand: ['latest_charge'],
            });
            
            const charge = paymentIntent.latest_charge;
            if (charge && typeof charge === 'object' && 'receipt_url' in charge) {
              receiptUrl = (charge as Stripe.Charge).receipt_url || undefined;
            }
          } catch (error) {
            console.error('Error fetching payment intent:', error);
          }
        }

        // Get invoice URL if this was a subscription
        if (session.invoice) {
          try {
            const invoice = typeof session.invoice === 'string'
              ? await this.stripe.invoices.retrieve(session.invoice)
              : session.invoice;
            invoiceUrl = invoice.hosted_invoice_url || undefined;
          } catch (error) {
            console.error('Error fetching invoice:', error);
          }
        }

        // Calculate if payment is refundable (within 14 days)
        const createdAt = new Date(session.created * 1000);
        const refundDeadline = new Date(createdAt);
        refundDeadline.setDate(refundDeadline.getDate() + 14);
        const refundable = new Date() < refundDeadline;

        return {
          id: session.id,
          paymentIntentId,
          courseName: session.metadata?.courseName || 'Unknown Course',
          courseId: session.metadata?.courseId,
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'usd').toUpperCase(),
          status: session.payment_status || 'unknown',
          createdAt,
          invoiceUrl,
          receiptUrl,
          refundable,
          refundDeadline,
        };
      })
    );

    return payments;
  }

  // Request a refund for a payment
  async requestRefund(paymentIntentId: string, reason?: string): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    this.ensureConfigured();

    try {
      // Get the payment intent to check if it's refundable
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Check if the payment was made within 14 days
      const paymentDate = new Date(paymentIntent.created * 1000);
      const refundDeadline = new Date(paymentDate);
      refundDeadline.setDate(refundDeadline.getDate() + 14);
      
      if (new Date() > refundDeadline) {
        return {
          success: false,
          error: 'Refund window has expired (14 days)',
        };
      }

      // Check if already refunded
      if (paymentIntent.status === 'canceled') {
        return {
          success: false,
          error: 'Payment has already been refunded or canceled',
        };
      }

      // Create the refund
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          customer_reason: reason || 'No reason provided',
        },
      });

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }

  // Get a single payment details
  async getPaymentDetails(sessionId: string): Promise<{
    id: string;
    paymentIntentId?: string;
    courseName: string;
    courseId?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    invoiceUrl?: string;
    receiptUrl?: string;
    billingDetails?: {
      name?: string;
      email?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    };
    paymentMethod?: string;
    last4?: string;
    brand?: string;
  } | null> {
    this.ensureConfigured();

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.latest_charge', 'payment_intent.payment_method'],
      });

      if (!session) return null;

      let invoiceUrl: string | undefined;
      let receiptUrl: string | undefined;
      let billingDetails: any;
      let paymentMethod: string | undefined;
      let last4: string | undefined;
      let brand: string | undefined;

      const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
      
      if (paymentIntent) {
        const charge = paymentIntent.latest_charge as Stripe.Charge | null;
        if (charge) {
          receiptUrl = charge.receipt_url || undefined;
          billingDetails = charge.billing_details;
        }

        const pm = paymentIntent.payment_method as Stripe.PaymentMethod | null;
        if (pm?.card) {
          paymentMethod = 'card';
          last4 = pm.card.last4;
          brand = pm.card.brand;
        }
      }

      if (session.invoice) {
        const invoice = typeof session.invoice === 'string'
          ? await this.stripe.invoices.retrieve(session.invoice)
          : session.invoice;
        invoiceUrl = invoice.hosted_invoice_url || undefined;
      }

      return {
        id: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
        courseName: session.metadata?.courseName || 'Unknown Course',
        courseId: session.metadata?.courseId,
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || 'usd').toUpperCase(),
        status: session.payment_status || 'unknown',
        createdAt: new Date(session.created * 1000),
        invoiceUrl,
        receiptUrl,
        billingDetails: billingDetails ? {
          name: billingDetails.name || undefined,
          email: billingDetails.email || undefined,
          address: billingDetails.address ? {
            line1: billingDetails.address.line1 || undefined,
            line2: billingDetails.address.line2 || undefined,
            city: billingDetails.address.city || undefined,
            state: billingDetails.address.state || undefined,
            postalCode: billingDetails.address.postal_code || undefined,
            country: billingDetails.address.country || undefined,
          } : undefined,
        } : undefined,
        paymentMethod,
        last4,
        brand,
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      return null;
    }
  }

  // Verify if a checkout session belongs to a user
  async verifySessionOwnership(sessionId: string, userId: string): Promise<{
    belongs: boolean;
    session?: Stripe.Checkout.Session;
  }> {
    this.ensureConfigured();
    
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      const belongs = session.metadata?.userId === userId;
      return { belongs, session };
    } catch (error) {
      return { belongs: false };
    }
  }

  // Build description based on license type
  private buildDescription(params: CreateCheckoutSessionParams): string {
    const parts: string[] = [];

    switch (params.licenseType) {
      case LicenseType.SEAT:
        parts.push(`${params.seatCount || 1} seat(s)`);
        break;
      case LicenseType.UNLIMITED:
        parts.push('Unlimited users');
        break;
      case LicenseType.TIME_LIMITED:
        parts.push(`${params.durationMonths} month access`);
        break;
    }

    if (params.isSubscription) {
      parts.push('(Monthly subscription)');
    }

    if (params.courseDescription) {
      parts.push(params.courseDescription);
    }

    return parts.join(' - ');
  }
}


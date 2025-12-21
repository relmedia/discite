import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  Query,
  RawBodyRequest,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { StripeService } from '../application/services/stripe.service';
import { LicenseService } from '@/modules/license/application/services/license.service';
import { MarketplaceService } from '@/modules/marketplace/application/services/marketplace.service';
import { HiddenPaymentEntity } from '@/infrastructure/database/entities/hidden-payment.entity';
import { TenantCourseLicenseEntity, LicenseStatus } from '@/infrastructure/database/entities/tenant-course-license.entity';
import { TenantEntity } from '@/infrastructure/database/entities/tenant.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ApiResponse, LicenseType, UserRole } from '@repo/shared';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('api/payments')
export class PaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly licenseService: LicenseService,
    private readonly marketplaceService: MarketplaceService,
    @InjectRepository(HiddenPaymentEntity)
    private readonly hiddenPaymentRepository: Repository<HiddenPaymentEntity>,
    @InjectRepository(TenantCourseLicenseEntity)
    private readonly licenseRepository: Repository<TenantCourseLicenseEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  // Create checkout session for purchasing a course license
  // All authenticated users can purchase courses
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
    @TenantId() tenantId: string,
  ): Promise<ApiResponse<any>> {
    // Get the marketplace course
    const course = await this.marketplaceService.getMarketplaceCourseById(dto.marketplaceCourseId);

    // Determine if we should auto-assign the purchaser (regular users only)
    const isRegularUser = userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN;

    // Handle free courses - create license directly
    if (course.isFree) {
      const license = await this.licenseService.createLicense({
        tenantId,
        marketplaceCourseId: course.id,
        licenseType: LicenseType.UNLIMITED,
        amountPaid: 0,
        currency: course.currency,
        purchasedById: userId,
        autoAssignPurchaser: isRegularUser, // Auto-assign for regular users
      });

      return {
        success: true,
        data: {
          isFree: true,
          licenseId: license.id,
          courseId: course.sourceCourseId,
        },
        message: 'Free course license created successfully',
      };
    }

    // Find the selected license option
    const licenseOption = course.licenseOptions.find(
      (opt) => opt.type === dto.licenseType,
    );

    if (!licenseOption) {
      throw new BadRequestException('Invalid license type for this course');
    }

    // Calculate price based on license type and seat count
    let totalPrice = licenseOption.price;
    if (dto.licenseType === LicenseType.SEAT && dto.seatCount) {
      totalPrice = licenseOption.price * dto.seatCount;
    }

    // Get frontend URL for redirects
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await this.stripeService.createCheckoutSession({
      courseId: course.id,
      courseName: course.title,
      courseDescription: course.description,
      price: totalPrice,
      currency: course.currency,
      licenseType: dto.licenseType,
      seatCount: dto.seatCount,
      durationMonths: licenseOption.durationMonths,
      isSubscription: licenseOption.isSubscription,
      tenantId,
      userId,
      successUrl: `${frontendUrl}/dashboard/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/dashboard/marketplace/cancelled`,
    });

    return {
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
      },
    };
  }

  // Verify and process successful payment
  // All authenticated users can verify their payment sessions
  @Get('verify-session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async verifySession(
    @Param('sessionId') sessionId: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<ApiResponse<any>> {
    // Retrieve the checkout session from Stripe
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      return {
        success: false,
        error: 'Payment not completed',
      };
    }

    // Check if license already exists (prevent duplicate processing)
    const metadata = session.metadata || {};
    
    // Verify the tenant matches
    if (metadata.tenantId !== tenantId) {
      return {
        success: false,
        error: 'Session does not belong to this tenant',
      };
    }

    // Determine if we should auto-assign the purchaser
    // Regular users (not admins) get auto-assigned to the course they purchased
    const isRegularUser = userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN;

    // Create the license
    try {
      const license = await this.licenseService.createLicense({
        tenantId: metadata.tenantId,
        marketplaceCourseId: metadata.courseId,
        licenseType: metadata.licenseType as LicenseType,
        seatCount: metadata.seatCount ? parseInt(metadata.seatCount, 10) : undefined,
        durationMonths: metadata.durationMonths ? parseInt(metadata.durationMonths, 10) : undefined,
        amountPaid: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency?.toUpperCase() || 'USD',
        purchasedById: metadata.userId,
        stripePaymentIntentId: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
        stripeSubscriptionId: typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id,
        isSubscription: !!session.subscription,
        autoAssignPurchaser: isRegularUser, // Auto-assign for regular users
      });

      return {
        success: true,
        data: {
          licenseId: license.id,
          courseName: session.metadata?.courseName,
          courseId: session.metadata?.courseId,
        },
        message: 'License created successfully',
      };
    } catch (error) {
      // License might already exist (duplicate request)
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('already has an active license')) {
        return {
          success: true,
          message: 'License already exists for this course',
        };
      }
      throw error;
    }
  }

  // Stripe webhook handler
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const payload = req.rawBody;
    
    if (!payload) {
      throw new BadRequestException('Missing request body');
    }

    const event = await this.stripeService.constructWebhookEvent(payload, signature);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // Only process paid sessions
        if (session.payment_status === 'paid' && session.metadata) {
          try {
            await this.licenseService.createLicense({
              tenantId: session.metadata.tenantId,
              marketplaceCourseId: session.metadata.courseId,
              licenseType: session.metadata.licenseType as LicenseType,
              seatCount: session.metadata.seatCount 
                ? parseInt(session.metadata.seatCount, 10) 
                : undefined,
              durationMonths: session.metadata.durationMonths 
                ? parseInt(session.metadata.durationMonths, 10) 
                : undefined,
              amountPaid: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency?.toUpperCase() || 'USD',
              purchasedById: session.metadata.userId,
              stripePaymentIntentId: session.payment_intent,
              stripeSubscriptionId: session.subscription,
              isSubscription: !!session.subscription,
              // Always try to auto-assign from webhook as a fallback
              // If user already assigned in verifySession, this will be handled gracefully
              autoAssignPurchaser: true,
            });
          } catch (error) {
            // License might already exist, ignore
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log('License creation from webhook:', errorMessage);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        
        // Find and cancel the license
        // Note: You'd need to store subscription ID on license to find it
        console.log('Subscription cancelled:', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        console.log('Payment failed for invoice:', invoice.id);
        // Could notify admin or suspend license
        break;
      }
    }

    return { received: true };
  }

  // Check if Stripe is configured
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        stripeConfigured: this.stripeService.isStripeConfigured(),
      },
    };
  }

  // Get payment history for the current user
  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  async getMyPayments(
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    // Get all payments from Stripe
    const payments = await this.stripeService.getPaymentHistory(userId);
    
    // Get hidden payment IDs for this user
    const hiddenPayments = await this.hiddenPaymentRepository.find({
      where: { userId },
      select: ['paymentSessionId'],
    });
    const hiddenIds = new Set(hiddenPayments.map(hp => hp.paymentSessionId));
    
    // Filter out hidden payments
    const visiblePayments = payments.filter(p => !hiddenIds.has(p.id));
    
    return {
      success: true,
      data: visiblePayments,
    };
  }

  // Get details for a specific payment
  @Get('details/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getPaymentDetails(
    @Param('sessionId') sessionId: string,
  ): Promise<ApiResponse<any>> {
    const details = await this.stripeService.getPaymentDetails(sessionId);
    
    if (!details) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    return {
      success: true,
      data: details,
    };
  }

  // Request a refund for a payment
  @Post('refund/:paymentIntentId')
  @UseGuards(JwtAuthGuard)
  async requestRefund(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: { reason?: string },
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    // Verify this payment belongs to the user
    const payments = await this.stripeService.getPaymentHistory(userId);
    const payment = payments.find(p => p.paymentIntentId === paymentIntentId);
    
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found or does not belong to you',
      };
    }

    if (!payment.refundable) {
      return {
        success: false,
        error: 'This payment is no longer eligible for refund',
      };
    }

    const result = await this.stripeService.requestRefund(paymentIntentId, body.reason);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // TODO: Cancel the associated license when refund is successful
    // This would require finding the license by payment intent ID

    return {
      success: true,
      data: {
        refundId: result.refundId,
      },
      message: 'Refund processed successfully',
    };
  }

  // Delete/hide a payment from user's view
  @Delete(':paymentId')
  @UseGuards(JwtAuthGuard)
  async deletePayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    // Check if already hidden
    const existingHidden = await this.hiddenPaymentRepository.findOne({
      where: { userId, paymentSessionId: paymentId },
    });

    if (existingHidden) {
      return {
        success: true,
        message: 'Payment already deleted',
      };
    }

    // Create hidden payment record
    // The payment is only visible to the user through getMyPayments,
    // which already filters by userId. So if they see it, they own it.
    const hiddenPayment = this.hiddenPaymentRepository.create({
      userId,
      paymentSessionId: paymentId,
    });
    
    try {
      await this.hiddenPaymentRepository.save(hiddenPayment);
    } catch (error) {
      // Handle potential race condition with unique constraint
      return {
        success: true,
        message: 'Payment already deleted',
      };
    }

    return {
      success: true,
      message: 'Payment deleted successfully',
    };
  }

  // ========== SUPERADMIN INVOICE INSIGHTS ==========

  // Get invoice insights for all tenants (superadmin only)
  @Get('admin/insights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getInvoiceInsights(
    @Query('days') days?: string,
  ): Promise<ApiResponse<any>> {
    const daysNum = days ? parseInt(days, 10) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get all licenses (invoices) with relations
    const licenses = await this.licenseRepository.find({
      where: {
        purchasedAt: MoreThanOrEqual(startDate),
      },
      relations: ['tenant', 'marketplaceCourse', 'purchasedBy'],
      order: { purchasedAt: 'DESC' },
    });

    // Calculate total revenue
    const totalRevenue = licenses.reduce((sum, l) => sum + Number(l.amountPaid), 0);

    // Revenue by status
    const revenueByStatus = {
      active: licenses.filter(l => l.status === LicenseStatus.ACTIVE).reduce((sum, l) => sum + Number(l.amountPaid), 0),
      pending: licenses.filter(l => l.status === LicenseStatus.PENDING).reduce((sum, l) => sum + Number(l.amountPaid), 0),
      cancelled: licenses.filter(l => l.status === LicenseStatus.CANCELLED).reduce((sum, l) => sum + Number(l.amountPaid), 0),
      expired: licenses.filter(l => l.status === LicenseStatus.EXPIRED).reduce((sum, l) => sum + Number(l.amountPaid), 0),
    };

    // Revenue by tenant
    const revenueByTenant: Record<string, { tenantId: string; tenantName: string; revenue: number; count: number }> = {};
    licenses.forEach(l => {
      if (!revenueByTenant[l.tenantId]) {
        revenueByTenant[l.tenantId] = {
          tenantId: l.tenantId,
          tenantName: l.tenant?.name || 'Unknown',
          revenue: 0,
          count: 0,
        };
      }
      revenueByTenant[l.tenantId].revenue += Number(l.amountPaid);
      revenueByTenant[l.tenantId].count += 1;
    });

    // Revenue by course
    const revenueByCourse: Record<string, { courseId: string; courseName: string; revenue: number; count: number }> = {};
    licenses.forEach(l => {
      if (!revenueByCourse[l.marketplaceCourseId]) {
        revenueByCourse[l.marketplaceCourseId] = {
          courseId: l.marketplaceCourseId,
          courseName: l.marketplaceCourse?.title || 'Unknown',
          revenue: 0,
          count: 0,
        };
      }
      revenueByCourse[l.marketplaceCourseId].revenue += Number(l.amountPaid);
      revenueByCourse[l.marketplaceCourseId].count += 1;
    });

    // Daily revenue trend
    const dailyRevenue: Record<string, number> = {};
    licenses.forEach(l => {
      const date = l.purchasedAt.toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(l.amountPaid);
    });

    // Format recent transactions
    const recentTransactions = licenses.slice(0, 20).map(l => ({
      id: l.id,
      tenantId: l.tenantId,
      tenantName: l.tenant?.name || 'Unknown',
      courseName: l.marketplaceCourse?.title || 'Unknown',
      courseId: l.marketplaceCourseId,
      amount: Number(l.amountPaid),
      currency: l.currency,
      status: l.status,
      licenseType: l.licenseType,
      purchasedBy: l.purchasedBy?.name || 'Unknown',
      purchasedByEmail: l.purchasedBy?.email || 'Unknown',
      purchasedAt: l.purchasedAt,
      isSubscription: l.isSubscription,
    }));

    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalTransactions: licenses.length,
          averageOrderValue: licenses.length > 0 ? totalRevenue / licenses.length : 0,
          subscriptionCount: licenses.filter(l => l.isSubscription).length,
        },
        revenueByStatus,
        revenueByTenant: Object.values(revenueByTenant).sort((a, b) => b.revenue - a.revenue),
        revenueByCourse: Object.values(revenueByCourse).sort((a, b) => b.revenue - a.revenue),
        dailyRevenue: Object.entries(dailyRevenue)
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        recentTransactions,
      },
    };
  }

  // Get all invoices for all tenants (superadmin only)
  @Get('admin/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getAllInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ): Promise<ApiResponse<any>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (status && Object.values(LicenseStatus).includes(status as LicenseStatus)) {
      whereClause.status = status;
    }
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const [invoices, total] = await this.licenseRepository.findAndCount({
      where: whereClause,
      relations: ['tenant', 'marketplaceCourse', 'purchasedBy'],
      order: { purchasedAt: 'DESC' },
      skip,
      take: limitNum,
    });

    const formattedInvoices = invoices.map(l => ({
      id: l.id,
      tenantId: l.tenantId,
      tenantName: l.tenant?.name || 'Unknown',
      courseName: l.marketplaceCourse?.title || 'Unknown',
      courseId: l.marketplaceCourseId,
      amount: Number(l.amountPaid),
      currency: l.currency,
      status: l.status,
      licenseType: l.licenseType,
      seatCount: l.seatCount,
      seatsUsed: l.seatsUsed,
      purchasedBy: l.purchasedBy?.name || 'Unknown',
      purchasedByEmail: l.purchasedBy?.email || 'Unknown',
      purchasedAt: l.purchasedAt,
      validFrom: l.validFrom,
      validUntil: l.validUntil,
      isSubscription: l.isSubscription,
      stripePaymentIntentId: l.stripePaymentIntentId,
    }));

    return {
      success: true,
      data: {
        invoices: formattedInvoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    };
  }

  // Get tenant list for filter dropdown (superadmin only)
  @Get('admin/tenants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async getTenantList(): Promise<ApiResponse<any>> {
    const tenants = await this.tenantRepository.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    return {
      success: true,
      data: tenants,
    };
  }
}


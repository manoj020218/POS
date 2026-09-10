import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { createSaleHandler } from '../sale/create-sale.js';
import type { SaleRepository } from '../sale/sale.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { PaymentGatewayCredentialService } from '../payment-gateways/payment-gateway-credential.service.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import { resolveReadBusinessIds } from '../catalog/catalog-business-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveKioskOrderItems } from './kiosk-order-totals.js';
import type { KioskRepository } from './kiosk.repository.js';
import type {
  CreateKioskOrderInput,
  KioskOrderCreatedView,
  KioskOrderRecord,
  KioskOrderView,
  TerminalSettingsView,
  UpdateTerminalSettingsInput
} from './kiosk.types.js';
import type { PaymentGateway } from './payment-gateway.js';

const defaultTerminalSettings = {
  gatewayTimeoutMinutes: 5,
  kioskCollectsPayment: false,
  mode: 'BILLING_POS' as const,
  printDualTokens: false
};

export const createKioskService = (
  repository: KioskRepository,
  catalogRepository: CatalogRepository,
  saleRepository: SaleRepository,
  customerRepository: CustomerRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository,
  paymentGateway: PaymentGateway,
  credentialService: PaymentGatewayCredentialService
) => {
  const createSale = createSaleHandler(
    saleRepository,
    catalogRepository,
    customerRepository,
    settingsRepository,
    tenantCoreRepository
  );

  const requireTerminal = async (context: AccessContext, terminalId: string) => {
    const branches = await tenantCoreRepository.listBranches(context.tenantId);
    for (const branch of branches) {
      const terminal = (await tenantCoreRepository.listTerminals(context.tenantId, branch.id)).find(
        (item) => item.id === terminalId
      );
      if (terminal) {
        return { branch, terminal };
      }
    }
    throw createHttpError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
  };

  const getSettingsOrDefault = async (tenantId: string, terminalId: string): Promise<TerminalSettingsView> => {
    const stored = await repository.findTerminalSettings(tenantId, terminalId);
    return {
      gatewayTimeoutMinutes: stored?.gatewayTimeoutMinutes ?? defaultTerminalSettings.gatewayTimeoutMinutes,
      kioskCollectsPayment: stored?.kioskCollectsPayment ?? defaultTerminalSettings.kioskCollectsPayment,
      mode: stored?.mode ?? defaultTerminalSettings.mode,
      printDualTokens: stored?.printDualTokens ?? defaultTerminalSettings.printDualTokens,
      terminalId
    };
  };

  const sweepExpiredOrders = async (tenantId: string) => {
    const expired = await repository.listExpiredAwaitingPayment(tenantId, new Date());
    await Promise.all(
      expired.map((order) => repository.updateKioskOrder(order.id, tenantId, { status: 'EXPIRED' }))
    );
  };

  const toView = (order: KioskOrderRecord): KioskOrderView => ({
    businessId: order.businessId,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt?.toISOString(),
    id: order.id,
    items: order.items,
    paidStamp: order.status === 'FULFILLED' && Boolean(order.gatewayPaymentRef),
    paymentReference: order.gatewayPaymentRef,
    status: order.status,
    tokenNumber: order.tokenNumber,
    totalAmount: order.totalAmount
  });

  return {
    getTerminalSettings: async (context: AccessContext, terminalId: string) => {
      const { branch } = await requireTerminal(context, terminalId);
      assertBranchAccess(context, branch.id);
      return getSettingsOrDefault(context.tenantId, terminalId);
    },

    updateTerminalSettings: async (
      context: AccessContext,
      terminalId: string,
      input: UpdateTerminalSettingsInput
    ) => {
      const { branch } = await requireTerminal(context, terminalId);
      assertBranchAccess(context, branch.id);
      const current = await getSettingsOrDefault(context.tenantId, terminalId);

      const saved = await repository.upsertTerminalSettings({
        gatewayTimeoutMinutes: input.gatewayTimeoutMinutes ?? current.gatewayTimeoutMinutes,
        kioskCollectsPayment: input.kioskCollectsPayment ?? current.kioskCollectsPayment,
        mode: input.mode ?? current.mode,
        printDualTokens: input.printDualTokens ?? current.printDualTokens,
        tenantId: context.tenantId,
        terminalId
      });

      return {
        gatewayTimeoutMinutes: saved.gatewayTimeoutMinutes,
        kioskCollectsPayment: saved.kioskCollectsPayment,
        mode: saved.mode,
        printDualTokens: saved.printDualTokens,
        terminalId: saved.terminalId
      } satisfies TerminalSettingsView;
    },

    createKioskOrder: async (
      context: AccessContext,
      input: CreateKioskOrderInput
    ): Promise<KioskOrderCreatedView> => {
      const { branch, terminal } = await requireTerminal(context, input.terminalId);
      if (branch.id !== input.branchId) {
        throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
      }
      assertBranchAccess(context, branch.id);
      if (!branch.isActive) throw createHttpError(409, 'BRANCH_INACTIVE', 'Branch is inactive');
      if (!terminal.isActive) throw createHttpError(409, 'TERMINAL_INACTIVE', 'Terminal is inactive');

      const settings = await getSettingsOrDefault(context.tenantId, input.terminalId);
      const { items, totalAmount } = await resolveKioskOrderItems(catalogRepository, branch.businessId, input.items);

      const sequenceDate = new Date().toISOString().slice(0, 10);
      const { sequence } = await repository.allocateTokenNumber(context.tenantId, input.terminalId, sequenceDate);
      const tokenNumber = `K-${String(sequence).padStart(3, '0')}`;

      const order = await repository.createKioskOrder({
        branchId: branch.id,
        businessId: branch.businessId,
        createdByUserId: context.userId,
        items,
        tenantId: context.tenantId,
        terminalId: input.terminalId,
        tokenNumber,
        tokenSequence: sequence,
        tokenSequenceDate: sequenceDate,
        totalAmount
      });

      if (!settings.kioskCollectsPayment) {
        return { ...toView(order), gatewayQrImageUrl: undefined };
      }

      const credentials = await credentialService.getResolvedCredentials(
        context.tenantId,
        branch.businessId,
        'razorpay'
      );
      if (!credentials) {
        throw createHttpError(
          503,
          'PAYMENT_GATEWAY_NOT_CONFIGURED',
          'Payment collection is not configured for this business — add Razorpay credentials in Settings first'
        );
      }

      const expiresAt = new Date(Date.now() + settings.gatewayTimeoutMinutes * 60 * 1000);
      const gatewayOrder = await paymentGateway.createUpiQrOrder(
        {
          keyId: credentials.fields.keyId ?? '',
          keySecret: credentials.fields.keySecret ?? '',
          webhookSecret: credentials.fields.webhookSecret ?? ''
        },
        {
          amount: totalAmount,
          closeBy: expiresAt,
          notes: { kioskOrderId: order.id, tokenNumber },
          receipt: order.id
        }
      );

      const updated = await repository.updateKioskOrder(order.id, context.tenantId, {
        expiresAt,
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        status: 'AWAITING_PAYMENT'
      });

      return {
        ...toView(updated ?? order),
        expiresAt: expiresAt.toISOString(),
        gatewayQrImageUrl: gatewayOrder.qrImageUrl
      };
    },

    getKioskOrder: async (context: AccessContext, orderId: string) => {
      await sweepExpiredOrders(context.tenantId);
      const order = await repository.findKioskOrderById(orderId);
      if (!order || order.tenantId !== context.tenantId) {
        throw createHttpError(404, 'KIOSK_ORDER_NOT_FOUND', 'Kiosk order not found');
      }
      assertBranchAccess(context, order.branchId);
      return toView(order);
    },

    listActiveKioskOrders: async (context: AccessContext, businessId?: string) => {
      await sweepExpiredOrders(context.tenantId);
      const businessIds = await resolveReadBusinessIds(context, tenantCoreRepository, businessId);
      const orders = await repository.listActiveKioskOrders(context.tenantId, businessIds);
      return orders.map(toView);
    },

    fulfillKioskOrder: async (context: AccessContext, orderId: string, saleId: string) => {
      const order = await repository.findKioskOrderById(orderId);
      if (!order || order.tenantId !== context.tenantId) {
        throw createHttpError(404, 'KIOSK_ORDER_NOT_FOUND', 'Kiosk order not found');
      }
      assertBranchAccess(context, order.branchId);
      const updated = await repository.updateKioskOrder(orderId, context.tenantId, {
        saleId,
        status: 'FULFILLED'
      });
      return toView(updated ?? order);
    },

    handleGatewayWebhook: async (rawBody: string, signature: string) => {
      // The order id inside the (still-unverified) body is only a lookup
      // key — it tells us which business's webhook secret to verify the
      // signature against next. Nothing from this step is trusted or acted
      // on until verifyAndParseWebhookEvent below actually confirms it.
      const gatewayOrderId = paymentGateway.extractWebhookGatewayOrderId(rawBody);
      if (!gatewayOrderId) {
        return;
      }

      const order = await repository.findKioskOrderByGatewayOrderId(gatewayOrderId);
      if (!order || order.status !== 'AWAITING_PAYMENT') {
        return;
      }

      const credentials = await credentialService.getResolvedCredentials(
        order.tenantId,
        order.businessId,
        'razorpay'
      );
      if (!credentials?.fields.webhookSecret) {
        return;
      }

      const event = paymentGateway.verifyAndParseWebhookEvent(
        rawBody,
        signature,
        credentials.fields.webhookSecret
      );
      if (!event || event.gatewayOrderId !== order.gatewayOrderId) {
        return;
      }

      const trustedContext: AccessContext = {
        assignedBranchIds: [],
        hasAllBranchAccess: true,
        tenantId: order.tenantId,
        userId: order.createdByUserId
      };

      const sale = await createSale(trustedContext, {
        branchId: order.branchId,
        items: order.items.map((item) => ({
          discountAmount: 0,
          productId: item.productId,
          quantity: item.quantity,
          taxAmount: 0,
          unitPrice: item.unitPrice
        })),
        payment: { method: 'UPI' },
        terminalId: order.terminalId
      });

      await repository.updateKioskOrder(order.id, order.tenantId, {
        gatewayPaymentRef: event.paymentRef,
        saleId: sale.id,
        status: 'FULFILLED'
      });
    }
  };
};

export type KioskService = ReturnType<typeof createKioskService>;

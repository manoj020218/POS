import type { AuthRepository } from '../auth/auth.repository.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveReportLookup } from './reporting-lookup.js';
import type { ReportingRepository } from './reporting.repository.js';
import type {
  BranchSalesSummaryRow,
  CashierSalesSummaryRow,
  PaymentMethodSummaryRow,
  SalesBreakdownView,
  SalesReportQuery,
  TerminalSalesSummaryRow
} from './reporting.types.js';
import { requireReportRecord, toSalesAggregateView } from './reporting-view.js';

export const createReportingBreakdownHandlers = (
  repository: ReportingRepository,
  authRepository: AuthRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  listSalesByBranch: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<BranchSalesSummaryRow>> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const branchesById = new Map(report.scope.branches.map((branch) => [branch.id, branch] as const));
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByBranch(report.lookup)).map((row) => {
        const branch = requireReportRecord(
          branchesById.get(row.branchId),
          'BRANCH_NOT_FOUND',
          'Branch not found'
        );
        const business = requireReportRecord(
          businessesById.get(row.businessId),
          'BUSINESS_NOT_FOUND',
          'Business not found'
        );

        return {
          ...toSalesAggregateView(row),
          branchCode: row.branchCode,
          branchId: row.branchId,
          branchName: branch.name,
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name
        };
      })
    };
  },
  listSalesByTerminal: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<TerminalSalesSummaryRow>> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const branchesById = new Map(report.scope.branches.map((branch) => [branch.id, branch] as const));
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );
    const terminals = await tenantCoreRepository.listTerminals(context.tenantId);
    const terminalsById = new Map(
      terminals
        .filter((terminal) => report.scope.branchIds.includes(terminal.branchId))
        .map((terminal) => [terminal.id, terminal] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByTerminal(report.lookup)).map((row) => {
        const branch = requireReportRecord(
          branchesById.get(row.branchId),
          'BRANCH_NOT_FOUND',
          'Branch not found'
        );
        const business = requireReportRecord(
          businessesById.get(row.businessId),
          'BUSINESS_NOT_FOUND',
          'Business not found'
        );
        const terminal = requireReportRecord(
          terminalsById.get(row.terminalId),
          'TERMINAL_NOT_FOUND',
          'Terminal not found'
        );

        return {
          ...toSalesAggregateView(row),
          branchCode: branch.code,
          branchId: branch.id,
          branchName: branch.name,
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name,
          terminalCode: row.terminalCode,
          terminalId: row.terminalId,
          terminalName: terminal.name
        };
      })
    };
  },
  listSalesByCashier: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<CashierSalesSummaryRow>> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const usersById = new Map(
      (await authRepository.listUsersForTenant(context.tenantId)).map((user) => [user.id, user] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByCashier(report.lookup)).map((row) => {
        const user = requireReportRecord(
          usersById.get(row.cashierUserId),
          'AUTH_USER_NOT_FOUND',
          'Auth user not found'
        );

        return {
          ...toSalesAggregateView(row),
          cashierDisplayName: user.displayName,
          cashierEmail: user.email,
          cashierUserId: row.cashierUserId
        };
      })
    };
  },
  listSalesByPaymentMethod: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<PaymentMethodSummaryRow>> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByPaymentMethod(report.lookup)).map((row) => ({
        ...toSalesAggregateView(row),
        paymentMethod: row.paymentMethod
      }))
    };
  }
});

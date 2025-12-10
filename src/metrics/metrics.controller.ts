import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoggedUser } from '../auth/logged-user.decorator';
import { User } from '../user/entities/user.entity';
import { MetricsService } from './metrics.service';
import { MetricsCronService } from './metrics-cron.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly metricsCronService: MetricsCronService,
  ) {}

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard data for the store' })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description:
      'Period to fetch data. Options: "current_month" (default), "YYYY-MM" (e.g., "2024-01"), "last_7_days", "last_30_days"',
    example: 'current_month',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data returned successfully.',
  })
  async getDashboard(
    @LoggedUser() user: User,
    @Query('period') period?: string,
  ) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const dashboardData = await this.metricsService.getDashboardData(
      user.storeId,
      period,
    );

    // Get cron health status for requested period
    const targetYear = dashboardData.period.year || new Date().getFullYear();
    const targetMonth =
      dashboardData.period.month || new Date().getMonth() + 1;

    const cronHealthStatus =
      await this.metricsCronService.getCronHealthStatus(
        targetYear,
        targetMonth,
      );

    return {
      ...dashboardData,
      cronHealthStatus,
    };
  }

  @Post('recalculate')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fix cron health issues by recalculating failed days (admin only)',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description:
      'Period to recalculate and return dashboard data for. Options: "current_month" (default), "YYYY-MM" (e.g., "2024-01"). Only monthly periods are supported for recalculation.',
    example: 'current_month',
  })
  async recalculateStoreMetrics(
    @LoggedUser() user: User,
    @Query('period') period?: string,
  ) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const storeId = user.storeId;
    const now = new Date();

    // Parse period to determine target year and month
    let targetYear: number;
    let targetMonth: number;

    if (!period || period === 'current_month') {
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    } else if (period.match(/^\d{4}-\d{2}$/)) {
      // Format: YYYY-MM
      const [year, month] = period.split('-').map(Number);
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month. Month must be between 1 and 12.');
      }
      targetYear = year;
      targetMonth = month;
    } else {
      throw new BadRequestException(
        'Invalid period format for recalculation. Use: "current_month" or "YYYY-MM" (e.g., "2024-01").',
      );
    }

    // Check health status for the specified month
    const healthStatus =
      await this.metricsCronService.getCronHealthStatus(
        targetYear,
        targetMonth,
      );

    if (healthStatus === 'OK') {
      throw new BadRequestException(
        `Cron health status is OK for ${targetYear}-${String(targetMonth).padStart(2, '0')}. No recalculation needed.`,
      );
    }

    // Find failed days in the specified month
    const failedExecutionDates =
      await this.metricsCronService.getFailedExecutionsInMonth(
        targetYear,
        targetMonth,
      );

    if (failedExecutionDates.length === 0) {
      throw new BadRequestException(
        `No failed executions found for ${targetYear}-${String(targetMonth).padStart(2, '0')}.`,
      );
    }

    // Recalculate metrics for each failed day
    const results: Array<{
      date: string;
      status: string;
      error?: string;
    }> = [];
    for (const executionDate of failedExecutionDates) {
      try {
        await this.metricsService.recalculateStoreMetrics(
          storeId,
          executionDate,
        );

        // Update execution status to SUCCESS
        await this.metricsCronService.updateExecutionStatusToSuccess(
          executionDate,
        );

        results.push({
          date: executionDate.toISOString().split('T')[0],
          status: 'SUCCESS',
        });
      } catch (error) {
        results.push({
          date: executionDate.toISOString().split('T')[0],
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    // Return updated dashboard data for the recalculated period
    const dashboardData = await this.metricsService.getDashboardData(
      storeId,
      period || 'current_month',
    );

    const dashboardYear = dashboardData.period.year || targetYear;
    const dashboardMonth = dashboardData.period.month || targetMonth;

    const cronHealthStatus =
      await this.metricsCronService.getCronHealthStatus(
        dashboardYear,
        dashboardMonth,
      );

    return {
      ...dashboardData,
      cronHealthStatus,
      fixedDates: results,
    };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh current day metrics and return updated dashboard data',
  })
  async refreshMetrics(@LoggedUser() user: User) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const storeId = user.storeId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Recalculate current day metrics (does not update cron execution status)
    await this.metricsService.recalculateStoreMetrics(storeId, today);

    // Return updated dashboard data (always current_month)
    const dashboardData = await this.metricsService.getDashboardData(
      storeId,
      // period not provided - uses default 'current_month'
    );

    const targetYear = dashboardData.period.year || new Date().getFullYear();
    const targetMonth =
      dashboardData.period.month || new Date().getMonth() + 1;

    const cronHealthStatus =
      await this.metricsCronService.getCronHealthStatus(
        targetYear,
        targetMonth,
      );

    return {
      ...dashboardData,
      cronHealthStatus,
    };
  }
}


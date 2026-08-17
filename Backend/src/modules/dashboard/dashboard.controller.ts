import { Controller, Get, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { DashboardEventsService } from './dashboard-events.service';
import { DashboardService } from './dashboard.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('dashboard.ver')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly events: DashboardEventsService,
  ) {}

  @Get('resumen')
  summary() { return this.dashboard.getSummary(); }

  @Sse('eventos')
  stream(): Observable<MessageEvent> { return this.events.stream(); }
}

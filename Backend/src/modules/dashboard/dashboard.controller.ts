import { Controller, Get, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { DashboardEventsService } from './dashboard-events.service';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
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

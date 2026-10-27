import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async overview() {
    const [users, travellersVerified, pendingVerifications, suspended, openDisputes, noMatch] =
      await Promise.all([
        this.prisma.user.count({ where: { role: 'USER' } }),
        this.prisma.user.count({ where: { travellerStatus: 'APPROVED' } }),
        this.prisma.identityVerification.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.dispute.count({ where: { status: { not: 'RESOLVED' } } }),
        this.prisma.shipment.count({ where: { status: 'NO_MATCH' } }),
      ]);
    return { users, travellersVerified, pendingVerifications, suspended, openDisputes, noMatch };
  }
}

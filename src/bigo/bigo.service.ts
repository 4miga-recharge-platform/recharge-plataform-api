import { Injectable } from '@nestjs/common';
import { RechargeDto } from './dto/recharge.dto';
import { BigoHttpService } from './http/bigo-http.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BigoService {
  constructor(
    private readonly http: BigoHttpService,
    private readonly prisma: PrismaService,
  ) {}

  private generateSeqId(): string {
    const timestamp = Date.now().toString(36);
    let rand = '';
    for (let i = 0; i < 16; i++) {
      rand += Math.floor(Math.random() * 36).toString(36);
    }
    const seqid = (timestamp + rand).slice(0, 20).replace(/[^0-9a-z]/g, '');
    return seqid;
  }

  async precheck() {
    const seqid = this.generateSeqId();
    return this.http.post('/sign/agent/recharge_pre_check', { seqid });
  }

  async recharge(payload: RechargeDto) {
    const seqid = this.generateSeqId();
    const body = {
      ...payload,
      seqid,
    } as any;

    return this.http.post('/sign/agent/rs_recharge', body);
  }

  async disable() {
    const seqid = this.generateSeqId();
    return this.http.post('/sign/agent/disable', { seqid });
  }

  async findAll() {
    return this.prisma.bigoRecharge.findMany({
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

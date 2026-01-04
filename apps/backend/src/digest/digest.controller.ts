import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PrincipalService } from '@server/auth/principal.service';
import { Request } from 'express';
import { DigestService } from './digest.service';
import { type DigestRunType } from './digest-run.entity';

@Controller('api/digests')
export class DigestController {
  constructor(
    private readonly digestService: DigestService,
    private readonly principalService: PrincipalService,
  ) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = await this.getUserId(req);
    const parsedPage = page ? Number(page) : 1;
    const parsedPageSize = pageSize ? Number(pageSize) : 20;
    return this.digestService.listDigests(userId, parsedPage, parsedPageSize);
  }

  @Get(':id')
  async detail(@Req() req: Request, @Param('id') id: string) {
    const userId = await this.getUserId(req);
    return this.digestService.getDigest(userId, id);
  }

  @Post('run')
  async run(@Req() req: Request, @Body() body: { type?: DigestRunType }) {
    const userId = await this.getUserId(req);
    const type = body.type ?? 'daily';
    return this.digestService.runManualDigest(userId, type);
  }

  private async getUserId(req: Request) {
    const principal = await this.principalService.getPrincipal(req);
    if (!principal) {
      throw new UnauthorizedException();
    }
    return principal.id;
  }
}

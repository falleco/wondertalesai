import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({
  name: 'Partner',
  description:
    'A partner is a company that is part of the loyalty program. They have a name, and ID and an API key to access the loyalty program on behalf of their users.',
})
export class Principal {
  @ApiProperty({
    description: 'Partner ID',
    type: String,
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  id: string;

  @ApiProperty({
    description: 'Partner name',
    type: String,
    example: 'Sophon Partner',
  })
  name: string;

  @ApiProperty({
    description: 'Partner created at',
    type: Date,
    example: '2025-01-01',
  })
  createdAt: Date;
}

export const AuthPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      return null;
    }

    return {
      ...request.user,
    } as Principal;
  },
);

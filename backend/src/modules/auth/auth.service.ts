import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Cria um novo usuário interno. Apenas ADMINs podem chamar este método
   * (a restrição é aplicada no Controller via @Roles).
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`E-mail ${dto.email} já está em uso.`);
    }

    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role ?? UserRole.OPERATOR,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    this.logger.log(`Novo usuário registado: ${user.email} (${user.role})`);

    return { accessToken: this.signToken(user), user };
  }

  /**
   * Autentica um usuário e retorna um JWT de acesso.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    this.logger.log(`Login bem-sucedido: ${user.email}`);

    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    return { accessToken: this.signToken(safeUser), user: safeUser };
  }

  private signToken(user: { id: string; email: string; role: string }): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    return this.jwtService.sign(payload, {
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }
}

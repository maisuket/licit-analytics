import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // Segurança: headers HTTP seguros via helmet
  app.use(helmet());

  // CORS restrito à origem do frontend
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  app.enableCors({ origin: frontendUrl, credentials: true });

  // Versionamento URI: todos os endpoints ficam em /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validação global estrita
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Filtro global de exceções — envelope { success: false, error: {...} }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptor global de respostas — envelope { success: true, data: {...} }
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Guards globais: JWT (autenticação) + Roles (autorização)
  // Rotas marcadas com @Public() ignoram o JwtAuthGuard automaticamente.
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
  );

  // Documentação Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('LicitAnalytics API')
    .setDescription(
      'API para mapeamento de empenhos, contratos e inteligência governamental via Portal da Transparência.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Hooks de encerramento corretos (essencial para o Prisma liberar conexões)
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Aplicação iniciada com sucesso na porta: ${port}`);
  logger.log(`🌍 CORS habilitado para: ${frontendUrl}`);
  logger.log(`📚 Swagger disponível em: http://localhost:${port}/api/docs`);
}

void bootstrap();

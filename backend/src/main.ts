import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Activa o CORS para permitir pedidos do Frontend em Next.js
  app.enableCors();

  // Configuração global do ValidationPipe para segurança e tipagem estrita
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove campos que não existam no DTO
      forbidNonWhitelisted: true, // Retorna erro 400 se enviar campos não mapeados
      transform: true, // Transforma automaticamente os payloads nas classes dos DTOs
    }),
  );

  // Configuração do Swagger para documentação automática
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Monitor de Empenhos - API')
    .setDescription(
      'API para mapeamento e consulta de empenhos do Portal da Transparência',
    )
    .setVersion('1.0')
    .addBearerAuth() // Deixamos o JWT preparado para futuras implementações de segurança
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Activa hooks de encerramento correctos (essencial para o Prisma ORM libertar ligações)
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Aplicação iniciada com sucesso na porta: ${port}`);
  logger.log(
    `📚 Documentação Swagger disponível em: http://localhost:${port}/api/docs`,
  );
}

// Executa o ponto de entrada
void bootstrap();

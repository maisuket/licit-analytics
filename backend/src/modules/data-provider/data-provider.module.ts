import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Importação essencial
import { ConfigModule } from '@nestjs/config';
import { DATA_PROVIDER_TOKEN } from './interfaces/data-provider.interface';
import { TransparencyApiProvider } from './providers/transparency.provider';

@Module({
  imports: [
    HttpModule, // Permite que o TransparencyApiProvider injete o HttpService
    ConfigModule, // Garante acesso ao ConfigService (embora geralmente seja global)
  ],
  providers: [
    {
      // Ao utilizarmos o Token, o resto do sistema não sabe se é o Mock ou a API Real.
      // Mais tarde, mudaremos apenas o "useClass" para o TransparencyApiProvider.
      provide: DATA_PROVIDER_TOKEN,
      useClass: TransparencyApiProvider,
    },
  ],
  exports: [DATA_PROVIDER_TOKEN], // Exportamos o token para injetar nos Services de Domínio
})
export class DataProviderModule {}

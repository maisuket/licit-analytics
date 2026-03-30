import { Injectable, Logger } from '@nestjs/common';
import { TipoDespesa } from '@prisma/client';
import {
  IDataProvider,
  RawExpenseData,
} from '../interfaces/data-provider.interface';

@Injectable()
export class MockDataProvider implements IDataProvider {
  private readonly logger = new Logger(MockDataProvider.name);

  async fetchExpensesByCnpjAndYear(
    cnpj: string,
    year: number,
  ): Promise<RawExpenseData[]> {
    this.logger.log(
      `A simular a busca de dados para o CNPJ: ${cnpj} e Ano: ${year}`,
    );

    // Simulamos um pequeno delay de rede para parecer uma API real
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Retornamos dados falsos perfeitamente formatados para os nossos testes iniciais
    return [
      {
        orgao: 'MINISTÉRIO DA SAÚDE',
        tipo: TipoDespesa.EMPENHO,
        valor: 150000.5,
        data: new Date(`${year}-03-15T00:00:00Z`),
        descricao: 'AQUISIÇÃO DE EQUIPAMENTOS MÉDICOS CONTRATO 012/2024',
        numeroDocumento: '2024NE000123',
      },
      {
        orgao: 'MINISTÉRIO DA SAÚDE',
        tipo: TipoDespesa.LIQUIDACAO,
        valor: 50000.0,
        data: new Date(`${year}-04-10T00:00:00Z`),
        descricao: 'LIQUIDAÇÃO REF AO CONTRATO 012/2024 NOTA FISCAL 998',
        numeroDocumento: '2024NS000456',
      },
      {
        orgao: 'MINISTÉRIO DA EDUCAÇÃO',
        tipo: TipoDespesa.EMPENHO,
        valor: 8500.0,
        data: new Date(`${year}-05-20T00:00:00Z`),
        descricao: 'PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO PREGÃO 05/2024',
        numeroDocumento: '2024NE000789',
      },
    ];
  }
}

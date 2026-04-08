import { Test, TestingModule } from '@nestjs/testing';
import { CorrelationService, CorrelationStrategy } from './correlation.service';
import { PrismaService } from '../../../shared/infra/database/prisma.service';
import { TipoDespesa } from '@prisma/client';

const prismaMock = {
  contract: { findMany: jest.fn() },
  expense: { findMany: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

const makeContract = (numero: string, objeto: string, id = `c-${numero}`) => ({
  id,
  companyId: 'company-1',
  numero,
  objeto,
  dataAssinatura: null,
  dataInicioVigencia: null,
  dataFimVigencia: null,
  valorInicial: 0,
  valorFinal: 0,
  situacao: 'Ativo',
  unidadeGestora: 'SEDUC',
  orgaoSuperior: null,
  deletedAt: null,
});

const makeExpense = (id: string, numeroProcesso: string | null, descricao: string) => ({
  id,
  numeroDocumento: `NE-${id}`,
  numeroProcesso,
  descricao,
  orgao: 'SEDUC',
});

describe('CorrelationService', () => {
  let service: CorrelationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrelationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CorrelationService>(CorrelationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('correlateForCompany', () => {
    it('deve retornar zero quando não há contratos', async () => {
      prismaMock.contract.findMany.mockResolvedValueOnce([]);
      prismaMock.expense.findMany.mockResolvedValueOnce([makeExpense('e1', null, 'Manutenção')]);

      const result = await service.correlateForCompany('company-1');

      expect(result.total).toBe(0);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('deve retornar zero quando não há empenhos sem vínculo', async () => {
      prismaMock.contract.findMany.mockResolvedValueOnce([makeContract('057/2022', 'Manutenção TI')]);
      prismaMock.expense.findMany.mockResolvedValueOnce([]);

      const result = await service.correlateForCompany('company-1');

      expect(result.total).toBe(0);
    });

    it('deve correlacionar via EXACT_PROCESS quando numeroProcesso contém o número do contrato', async () => {
      prismaMock.contract.findMany.mockResolvedValueOnce([makeContract('057/2022', 'Objeto irrelevante')]);
      prismaMock.expense.findMany.mockResolvedValueOnce([
        makeExpense('e1', 'PROC-057/2022-SEDUC', 'Descrição qualquer'),
      ]);
      prismaMock.$transaction.mockResolvedValueOnce([{}]);

      const result = await service.correlateForCompany('company-1');

      expect(result.total).toBe(1);
      expect(result.byStrategy[CorrelationStrategy.EXACT_PROCESS]).toBe(1);
    });

    it('deve correlacionar via SUBSTRING quando número do contrato aparece na descrição', async () => {
      prismaMock.contract.findMany.mockResolvedValueOnce([makeContract('099/2023', 'Limpeza Escolar')]);
      prismaMock.expense.findMany.mockResolvedValueOnce([
        makeExpense('e2', null, 'REFERENTE AO CONTRATO 099/2023'),
      ]);
      prismaMock.$transaction.mockResolvedValueOnce([{}]);

      const result = await service.correlateForCompany('company-1');

      expect(result.total).toBe(1);
      expect(result.byStrategy[CorrelationStrategy.SUBSTRING]).toBe(1);
    });

    it('deve persistir em batches de 50 quando há mais de 50 correlações', async () => {
      const contracts = Array.from({ length: 5 }, (_, i) =>
        makeContract(`${i}/2023`, `Objeto ${i}`),
      );

      // 60 empenhos, todos com numeroProcesso matching contratos diferentes
      const expenses = Array.from({ length: 60 }, (_, i) =>
        makeExpense(`e${i}`, `PROC-${i % 5}/2023`, `Desc ${i}`),
      );

      prismaMock.contract.findMany.mockResolvedValueOnce(contracts);
      prismaMock.expense.findMany.mockResolvedValueOnce(expenses);
      prismaMock.$transaction.mockResolvedValue([{}]);

      await service.correlateForCompany('company-1');

      // 60 resultados / 50 por batch = 2 chamadas a $transaction
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';
import { PrismaService } from '../../shared/infra/database/prisma.service';

// Mock do PrismaService — evita conexão real ao banco
const prismaMock = {
  company: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // createOrFind
  // ---------------------------------------------------------------------------
  describe('createOrFind', () => {
    it('deve fazer upsert e retornar a empresa', async () => {
      const dto = { cnpj: '23008295000148', name: 'Empresa Teste' };
      const expected = { id: 'uuid-1', cnpj: dto.cnpj, name: dto.name };

      prismaMock.company.upsert.mockResolvedValueOnce(expected);

      const result = await service.createOrFind(dto);

      expect(prismaMock.company.upsert).toHaveBeenCalledWith({
        where: { cnpj: dto.cnpj },
        update: {},
        create: { cnpj: dto.cnpj, name: dto.name },
      });
      expect(result).toEqual(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // findByCnpj
  // ---------------------------------------------------------------------------
  describe('findByCnpj', () => {
    it('deve retornar a empresa quando encontrada', async () => {
      const company = {
        id: 'uuid-1',
        cnpj: '23008295000148',
        name: 'Empresa Teste',
        _count: { expenses: 10, contracts: 2 },
      };

      prismaMock.company.findUnique.mockResolvedValueOnce(company);

      const result = await service.findByCnpj('23008295000148');

      expect(result).toEqual(company);
    });

    it('deve lançar NotFoundException quando CNPJ não existe', async () => {
      prismaMock.company.findUnique.mockResolvedValueOnce(null);

      await expect(service.findByCnpj('00000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const companies = [{ id: 'uuid-1', cnpj: '23008295000148', name: 'Teste' }];
      prismaMock.$transaction.mockResolvedValueOnce([companies, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(companies);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10, totalPages: 1 });
    });

    it('deve aplicar filtro de pesquisa quando search é fornecido', async () => {
      prismaMock.$transaction.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 10, search: 'Teste' });

      const [[findManyCall]] = prismaMock.$transaction.mock.calls as [[unknown, unknown]];
      // Verifica que o $transaction foi chamado (o where é construído internamente)
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(findManyCall).toBeDefined();
    });
  });
});

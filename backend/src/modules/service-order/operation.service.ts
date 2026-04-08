import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TipoDespesa, OsStatus } from '@prisma/client';
import * as Papa from 'papaparse';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { QueryServiceOrderDto } from './dto/query-service-order.dto';

@Injectable()
export class OperationService {
  private readonly logger = new Logger(OperationService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getCol(row: Record<string, unknown>, possibleNames: string[]): string | null {
    const keys = Object.keys(row);
    for (const key of keys) {
      const cleanKey = key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      for (const name of possibleNames) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanKey.includes(cleanName) || cleanName.includes(cleanKey)) {
          const val = row[key];
          return val !== undefined && val !== null ? String(val) : null;
        }
      }
    }
    return null;
  }

  private parseExcelNumber(value: unknown): number {
    if (!value || value === '-' || value === 'X' || value === '') return 0;
    if (typeof value === 'number') return value;

    let stringVal = String(value)
      .trim()
      .replace(/R\$/g, '')
      .replace(/\s/g, '');

    if (stringVal.includes(',') && stringVal.includes('.')) {
      stringVal = stringVal.replace(/\./g, '').replace(',', '.');
    } else if (stringVal.includes(',')) {
      stringVal = stringVal.replace(',', '.');
    }
    return parseFloat(stringVal) || 0;
  }

  private parseExcelDate(value: string | null): Date {
    if (!value) return new Date();
    if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length >= 3)
        return new Date(
          `${parts[2]?.trim()}-${parts[1]?.trim()}-${parts[0]?.trim()}T12:00:00Z`,
        );
    }
    return new Date(`${value.trim()}T12:00:00Z`);
  }

  async importFromCsv(
    cnpj: string,
    type: 'empenho' | 'os',
    file: Express.Multer.File,
  ): Promise<{ message: string; imported: number }> {
    this.logger.log(
      `A iniciar importação em lote (${type}) para o CNPJ: ${cnpj}`,
    );

    let company = await this.prisma.company.findUnique({ where: { cnpj } });
    if (!company) {
      company = await this.prisma.company.create({
        data: { cnpj, name: 'Empresa ERP (Importada)' },
      });
    }

    // Detecção automática de encoding ANSI vs UTF-8
    let csvString = file.buffer.toString('utf-8');
    if (csvString.includes('\uFFFD')) {
      this.logger.log('Encoding ANSI/Windows-1252 detectado. Convertendo para latin1...');
      csvString = file.buffer.toString('latin1');
    }

    const parsed = Papa.parse<Record<string, unknown>>(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    let itemsImported = 0;

    if (type === 'empenho') {
      for (const row of parsed.data) {
        const numeroDocumento = this.getCol(row, ['NE', 'EMPENHO']);
        if (!numeroDocumento || numeroDocumento.trim() === '') continue;

        const valorOriginal = this.parseExcelNumber(
          this.getCol(row, ['VALOR', 'VALORTOTAL']),
        );
        const valorFaturado = this.parseExcelNumber(this.getCol(row, ['FATURADO']));
        const saldo = this.parseExcelNumber(this.getCol(row, ['SALDO']));

        const expense = await this.prisma.expense.findFirst({
          where: {
            numeroDocumento: numeroDocumento.trim(),
            companyId: company.id,
          },
        });

        const dataPayload: Prisma.ExpenseUpdateInput = {
          company: { connect: { id: company.id } },
          numeroDocumento: numeroDocumento.trim(),
          orgao: this.getCol(row, ['SECRETARIA', 'ORGAO']) ?? 'N/A',
          recurso: this.getCol(row, ['RECURSO']),
          competencia: this.getCol(row, ['COMPETENCIA']),
          valorOriginal,
          valorFaturado,
          saldo,
          descricao: `Contrato: ${this.getCol(row, ['CONTRATO']) ?? 'N/A'}`,
          data: this.parseExcelDate(this.getCol(row, ['DATA', 'EMISSAO'])),
          tipo: TipoDespesa.EMPENHO,
        };

        if (expense) {
          await this.prisma.expense.update({
            where: { id: expense.id },
            data: dataPayload,
          });
        } else {
          await this.prisma.expense.create({
            data: {
              companyId: company.id,
              numeroDocumento: numeroDocumento.trim(),
              orgao: this.getCol(row, ['SECRETARIA', 'ORGAO']) ?? 'N/A',
              recurso: this.getCol(row, ['RECURSO']),
              competencia: this.getCol(row, ['COMPETENCIA']),
              valorOriginal,
              valorFaturado,
              saldo,
              descricao: `Contrato: ${this.getCol(row, ['CONTRATO']) ?? 'N/A'}`,
              data: this.parseExcelDate(this.getCol(row, ['DATA', 'EMISSAO'])),
              tipo: TipoDespesa.EMPENHO,
            },
          });
        }
        itemsImported++;
      }
    } else if (type === 'os') {
      for (const row of parsed.data) {
        const numeroOS = this.getCol(row, ['OS', 'ORDEMDESERVICO']);
        const numeroDocumento = this.getCol(row, ['EMPENHO', 'NE']);

        if (!numeroOS || !numeroDocumento) continue;

        let expense = await this.prisma.expense.findFirst({
          where: {
            numeroDocumento: numeroDocumento.trim(),
            companyId: company.id,
          },
        });

        if (!expense) {
          expense = await this.prisma.expense.create({
            data: {
              companyId: company.id,
              numeroDocumento: numeroDocumento.trim(),
              orgao: 'GERADO AUTO',
              valorOriginal: 0,
              descricao: 'Criado via importação de O.S.',
              data: new Date(),
              tipo: TipoDespesa.EMPENHO,
            },
          });
        }

        const rawStatus = (this.getCol(row, ['SITUCAO', 'STATUS', 'SITUACAO']) ?? '')
          .toUpperCase()
          .trim();
        let status: OsStatus = OsStatus.AGUARDANDO;
        if (rawStatus.includes('FATURADO')) status = OsStatus.FATURADO;
        if (rawStatus.includes('PAGO')) status = OsStatus.PAGO;

        const existingOs = await this.prisma.serviceOrder.findFirst({
          where: { numeroOS: numeroOS.trim(), expenseId: expense.id },
        });

        const rawContrato = this.getCol(row, ['CONTRATO']);
        const rawMunicipio = this.getCol(row, ['CDE', 'MUNICIPIO']);
        const rawProcesso = this.getCol(row, ['PROCESSO']);
        const rawDesc = this.getCol(row, ['DESCRICAO']);

        const descParts: string[] = [];
        if (rawContrato) descParts.push(`Contrato: ${rawContrato}`);
        if (rawMunicipio) descParts.push(`Mun: ${rawMunicipio}`);
        if (rawProcesso) descParts.push(`Proc: ${rawProcesso}`);
        if (rawDesc) descParts.push(rawDesc);

        const custoTotal = this.parseExcelNumber(this.getCol(row, ['CUSTO', 'VO']));
        const valorFinal = this.parseExcelNumber(this.getCol(row, ['VF', 'VALORFINAL']));

        let margem = this.parseExcelNumber(this.getCol(row, ['MARGEM']));
        if (Math.abs(margem) >= 10) {
          margem = valorFinal > 0 ? (valorFinal - custoTotal) / valorFinal : 0;
        }

        const nfRaw = this.getCol(row, ['NF']);
        const osPayload: Prisma.ServiceOrderCreateInput = {
          expense: { connect: { id: expense.id } },
          numeroOS: numeroOS.trim(),
          unidade: this.getCol(row, ['UNIDADE', 'LOCAL']) ?? 'NÃO INFORMADA',
          dataExecucao: this.parseExcelDate(this.getCol(row, ['DATA'])),
          quantidade: this.parseExcelNumber(this.getCol(row, ['QTD', 'MAQUINAS', 'QUANTIDADE'])),
          descricao: descParts.length > 0 ? descParts.join(' | ') : null,
          executante: this.getCol(row, ['EXECUTANTE']),
          custo: custoTotal,
          valorFinal,
          margem,
          status,
          competencia: this.getCol(row, ['COMPETENCIA']),
          numeroNF: nfRaw === '-' ? null : nfRaw,
        };

        if (existingOs) {
          await this.prisma.serviceOrder.update({
            where: { id: existingOs.id },
            data: osPayload,
          });
        } else {
          await this.prisma.serviceOrder.create({ data: osPayload });
        }
        itemsImported++;
      }
    }

    return {
      message: 'Importação processada com sucesso!',
      imported: itemsImported,
    };
  }

  async create(dto: CreateServiceOrderDto) {
    const descParts: string[] = [];
    if (dto.contrato) descParts.push(`Contrato: ${dto.contrato}`);
    if (dto.municipio) descParts.push(`Mun: ${dto.municipio}`);
    if (dto.processo) descParts.push(`Proc: ${dto.processo}`);
    if (dto.descricao) descParts.push(dto.descricao);

    return this.prisma.$transaction(async (tx) => {
      const os = await tx.serviceOrder.create({
        data: {
          expense: { connect: { id: dto.expenseId } },
          numeroOS: dto.numeroOS,
          unidade: dto.unidade,
          dataExecucao: new Date(dto.dataExecucao),
          quantidade: dto.quantidade,
          descricao: descParts.length > 0 ? descParts.join(' | ') : null,
          executante: dto.executante,
          custo: dto.custoTotal,
          valorFinal: dto.valorFinal,
          margem: dto.margem,
          status: dto.status ?? OsStatus.AGUARDANDO,
          competencia: dto.competencia,
          numeroNF: dto.nf,
        },
      });

      const expense = await tx.expense.findUnique({
        where: { id: dto.expenseId },
      });

      if (expense) {
        const novoFaturado = Number(expense.valorFaturado) + dto.valorFinal;
        const novoSaldo = Number(expense.valorOriginal) - novoFaturado;
        await tx.expense.update({
          where: { id: expense.id },
          data: { valorFaturado: novoFaturado, saldo: novoSaldo },
        });
      }

      return os;
    });
  }

  async findAll(query: QueryServiceOrderDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceOrderWhereInput = {};

    if (query.search) {
      where.OR = [
        { unidade: { contains: query.search, mode: 'insensitive' } },
        { numeroOS: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.expenseId) where.expenseId = query.expenseId;

    const [data, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataExecucao: 'desc' },
        include: {
          expense: { select: { numeroDocumento: true, orgao: true } },
        },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    const formattedData = data.map((os) => {
      let contratoStr: string | null = null;
      let municipioStr: string | null = null;

      if (os.descricao) {
        const parts = os.descricao.split(' | ');
        parts.forEach((p) => {
          if (p.startsWith('Contrato: ')) contratoStr = p.replace('Contrato: ', '');
          if (p.startsWith('Mun: ')) municipioStr = p.replace('Mun: ', '');
        });
      }

      return {
        ...os,
        contrato: contratoStr,
        municipio: municipioStr,
        custoTotal: Number(os.custo),
        valorFinal: Number(os.valorFinal),
        margem: Number(os.margem),
        quantidade: Number(os.quantidade),
      };
    });

    return {
      data: formattedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: string, status: OsStatus, nf?: string) {
    const os = await this.prisma.serviceOrder.findUnique({ where: { id } });
    if (!os) throw new NotFoundException('Ordem de serviço não encontrada.');

    return this.prisma.serviceOrder.update({
      where: { id },
      data: { status, numeroNF: nf !== undefined ? nf : os.numeroNF },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const os = await tx.serviceOrder.findUnique({ where: { id } });
      if (!os) throw new NotFoundException('Ordem de serviço não encontrada.');

      const expense = await tx.expense.findUnique({
        where: { id: os.expenseId },
      });

      if (expense) {
        const novoFaturado = Number(expense.valorFaturado) - Number(os.valorFinal);
        const novoSaldo = Number(expense.valorOriginal) - novoFaturado;
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            valorFaturado: Math.max(0, novoFaturado),
            saldo: novoSaldo,
          },
        });
      }

      await tx.serviceOrder.delete({ where: { id } });
      return { message: 'Excluída com sucesso.' };
    });
  }

  async generateOsPdf(id: string): Promise<Buffer> {
    const os = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: { expense: true },
    });

    if (!os) throw new NotFoundException('Ordem de serviço não encontrada.');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(20).text('ORDEM DE SERVIÇO DE MANUTENÇÃO', { align: 'center' });
      doc.moveDown(2);

      doc.rect(50, 110, 495, 80).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12).text(`   Nº da O.S.: `, { continued: true }).font('Helvetica').text(os.numeroOS);
      doc.font('Helvetica-Bold').text(`   Data de Execução: `, { continued: true }).font('Helvetica').text(new Date(os.dataExecucao).toLocaleDateString('pt-BR'));
      doc.font('Helvetica-Bold').text(`   Status no Sistema: `, { continued: true }).font('Helvetica').text(os.status);
      doc.moveDown(2.5);

      doc.font('Helvetica-Bold').fontSize(14).text('DADOS DA UNIDADE E VÍNCULO PÚBLICO');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(11).text(`Unidade / Escola: `, { continued: true }).font('Helvetica').text(os.unidade);

      let municipioImp = 'Não informado';
      let contratoImp = 'Não informado';

      if (os.descricao) {
        const parts = os.descricao.split('|');
        const munPart = parts.find((p) => p.includes('Mun:'));
        const contratoPart = parts.find((p) => p.includes('Contrato:'));
        if (munPart) municipioImp = munPart.replace('Mun:', '').trim();
        if (contratoPart) contratoImp = contratoPart.replace('Contrato:', '').trim();
      }

      doc.font('Helvetica-Bold').text(`Município / CDE: `, { continued: true }).font('Helvetica').text(municipioImp);
      doc.font('Helvetica-Bold').text(`Contrato Base: `, { continued: true }).font('Helvetica').text(contratoImp);
      doc.font('Helvetica-Bold').text(`Nota de Empenho (NE): `, { continued: true }).font('Helvetica').text(os.expense?.numeroDocumento ?? 'N/A');
      doc.moveDown(1.5);

      doc.font('Helvetica-Bold').fontSize(14).text('ESCOPO TÉCNICO');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(11).text(`Quantidade Executada: `, { continued: true }).font('Helvetica').text(`${os.quantidade} unidade(s) / máquina(s)`);
      doc.font('Helvetica-Bold').text(`Equipe Técnica: `, { continued: true }).font('Helvetica').text(os.executante ?? 'Não informado');

      let observacoes = 'Sem observações adicionais.';
      if (os.descricao) {
        const descLimpa = os.descricao
          .split('|')
          .filter((p) => !p.includes('Contrato:') && !p.includes('Mun:') && !p.includes('Proc:'))
          .join('')
          .trim();
        if (descLimpa) observacoes = descLimpa;
      }
      doc.font('Helvetica-Bold').text(`Observações: `, { continued: true }).font('Helvetica').text(observacoes);
      doc.moveDown(3);

      doc.fontSize(10).font('Helvetica-Oblique').text(
        'Atestamos para os devidos fins que os serviços de manutenção descritos acima foram executados e entregues conforme os padrões de qualidade exigidos pelo contrato.',
        { align: 'justify' },
      );
      doc.moveDown(6);

      const signatureY = doc.y;
      doc.moveTo(70, signatureY).lineTo(250, signatureY).stroke();
      doc.moveTo(340, signatureY).lineTo(520, signatureY).stroke();
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('TÉCNICO RESPONSÁVEL', 70, signatureY + 10, { width: 180, align: 'center' });
      doc.text('GESTOR(A) / DIRETOR(A) DA UNIDADE', 340, signatureY + 10, { width: 180, align: 'center' });

      doc.end();
    });
  }
}

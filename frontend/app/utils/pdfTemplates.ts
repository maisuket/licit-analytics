import { ErpServiceOrder } from "../types/dashboard";
import { formatDateStr } from "./formatters";

export const generateOsPdfTemplate = (os: ErpServiceOrder): string => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ordem de Serviço - ${os.numeroOS}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        body { 
          font-family: 'Inter', sans-serif; 
          margin: 0; 
          padding: 40px; 
          color: #1e293b; 
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header { 
          display: flex; justify-content: space-between; align-items: center; 
          border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; 
        }
        .header-left h1 { margin: 0; font-size: 28px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
        .header-left p { margin: 4px 0 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .header-right { text-align: right; }
        .os-badge { 
          background: #eff6ff; color: #1d4ed8; padding: 8px 16px; 
          border-radius: 8px; font-weight: 800; font-size: 18px; border: 1px solid #bfdbfe;
        }
        
        .section { margin-bottom: 30px; }
        .section-title { 
          font-size: 14px; font-weight: 800; text-transform: uppercase; color: #475569; 
          margin-bottom: 15px; display: flex; align-items: center; gap: 8px;
        }
        .section-title::before { content: ''; display: block; width: 24px; height: 3px; background: #3b82f6; border-radius: 2px; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        
        .field { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; }
        .field-label { display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .field-value { display: block; font-size: 15px; font-weight: 600; color: #0f172a; }
        
        .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; text-align: center; }
        .highlight-value { font-size: 24px; font-weight: 800; color: #15803d; }
        
        .signatures { 
          display: flex; justify-content: space-between; gap: 40px; 
          margin-top: 80px; padding-top: 40px; 
        }
        .sig-box { flex: 1; text-align: center; }
        .sig-line { border-top: 1px solid #cbd5e1; margin-bottom: 12px; width: 100%; }
        .sig-name { font-weight: 800; font-size: 14px; color: #334155; }
        .sig-role { font-size: 12px; color: #64748b; margin-top: 4px; }
        .sig-stamp { 
          margin-top: 20px; width: 120px; height: 60px; border: 2px dashed #cbd5e1; 
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; color: #cbd5e1; border-radius: 8px;
        }

        .footer { 
          margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; 
          text-align: center; font-size: 10px; color: #94a3b8; 
        }

        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- CABEÇALHO -->
        <div class="header">
          <div class="header-left">
            <h1>BOLETIM DE MEDIÇÃO</h1>
            <p>Termo de Ateste de Serviços Prestados</p>
          </div>
          <div class="header-right">
            <div class="os-badge">O.S. Nº ${os.numeroOS}</div>
          </div>
        </div>

        <!-- SEÇÃO 1: VÍNCULO PÚBLICO -->
        <div class="section">
          <div class="section-title">Vínculo Contratual</div>
          <div class="grid">
            <div class="field">
              <span class="field-label">Órgão Solicitante</span>
              <span class="field-value">${os.expense?.orgao || "Não informado"}</span>
            </div>
            <div class="field">
              <span class="field-label">Nota de Empenho (NE)</span>
              <span class="field-value">${os.expense?.numeroDocumento || "Não informado"}</span>
            </div>
            <div class="field">
              <span class="field-label">Contrato Nº</span>
              <span class="field-value">${os.contrato || "N/A"}</span>
            </div>
            <div class="field">
              <span class="field-label">Processo Nº</span>
              <span class="field-value">${os.processo || "N/A"}</span>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 2: LOCAL DA EXECUÇÃO -->
        <div class="section">
          <div class="section-title">Localização e Unidade</div>
          <div class="grid">
            <div class="field" style="grid-column: span 2;">
              <span class="field-label">Nome da Unidade Escolar / Edifício</span>
              <span class="field-value">${os.unidade}</span>
            </div>
            <div class="field">
              <span class="field-label">Município / CDE</span>
              <span class="field-value">${os.municipio || "Não especificado"}</span>
            </div>
            <div class="field">
              <span class="field-label">Data da Execução</span>
              <span class="field-value">${formatDateStr(os.dataExecucao)}</span>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 3: ESCOPO DO SERVIÇO -->
        <div class="section">
          <div class="section-title">Resumo da Produção (PS)</div>
          <div class="grid" style="grid-template-columns: 1fr 2fr;">
            <div class="highlight-box">
              <span class="field-label" style="color: #166534;">Quantidade Atestada</span>
              <span class="highlight-value">${os.quantidade} un.</span>
            </div>
            <div class="field" style="display: flex; flex-direction: column; justify-content: center;">
              <span class="field-label">Descrição da Categoria</span>
              <span class="field-value" style="font-weight: 400;">${os.descricao || "Serviços executados rigorosamente conforme escopo contratual."}</span>
            </div>
          </div>
        </div>

        <!-- ASSINATURAS -->
        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${os.executante || "Equipe Técnica Autorizada"}</div>
            <div class="sig-role">Assinatura do Técnico Executante</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">Gestor(a) da Unidade</div>
            <div class="sig-role">
              Atesto que os serviços foram realizados satisfatoriamente.<br/>
              Matrícula / RG: ________________________
            </div>
            <div class="sig-stamp">Carimbo da Unidade</div>
          </div>
        </div>

        <div class="footer">
          Documento gerado eletronicamente pelo sistema LicitAnalytics ERP. <br/>
          Ref. Interna: ${os.id} • Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>

      <script>
        // Chama a impressão e fecha a aba logo após o utilizador confirmar ou cancelar.
        setTimeout(() => {
          window.print();
        }, 500);
      </script>
    </body>
    </html>
  `;
};

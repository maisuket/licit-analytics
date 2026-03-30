/**
 * Utilitário para extração inteligente de identificadores governamentais
 * a partir de descrições de texto livre.
 */

export interface ExtractedIdentifier {
  identificador: string | null;
  score: number;
}

export class RegexUtil {
  /**
   * Analisa a descrição da despesa e tenta extrair o número do contrato, pregão ou processo.
   * Retorna também um score de confiança baseado no quão explícito é o padrão.
   */
  static extractPublicIdentifier(description: string): ExtractedIdentifier {
    const text = description.toUpperCase();

    // 1. Padrão de Contrato Explícito (Altíssima Confiança - 99%)
    // Ex: "CONTRATO 012/2024", "CONTRATO Nº 123/2023"
    const contractMatch = text.match(
      /CONTRATO\s*(?:N[ºO]?\s*)?(\d{1,5}\/\d{4})/,
    );
    if (contractMatch && contractMatch[1]) {
      return { identificador: `CONTRATO ${contractMatch[1]}`, score: 99.0 };
    }

    // 2. Padrão de Pregão Eletrónico (Alta Confiança - 85%)
    // Ex: "PREGÃO ELETRÔNICO 05/2024", "PE 05/2024"
    const pregaoMatch = text.match(
      /PREG[AÃ]O\s*(?:ELETR[OÔ]NICO\s*)?(?:N[ºO]?\s*)?(\d{1,5}\/\d{4})/,
    );
    if (pregaoMatch && pregaoMatch[1]) {
      return { identificador: `PREGÃO ${pregaoMatch[1]}`, score: 85.0 };
    }

    // 3. Padrão de Processo Administrativo (Confiança Média - 70%)
    // Ex: "PROCESSO 23000.123456/2024-12"
    const processoMatch = text.match(
      /PROCESSO\s*(?:N[ºO]?\s*)?([\d\.\-\/]{10,})/,
    );
    if (processoMatch && processoMatch[1]) {
      return { identificador: `PROCESSO ${processoMatch[1]}`, score: 70.0 };
    }

    // 4. Fallback: Nenhum padrão claro encontrado (Baixa Confiança - 40%)
    // Agruparemos por similaridade de texto futuramente, por agora retornamos null
    return { identificador: null, score: 40.0 };
  }
}

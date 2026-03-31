export const formatCurrency = (val: number) =>
  `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatPercent = (val: number) => `${val.toFixed(2)}%`;

export const formatDateStr = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-BR");
};

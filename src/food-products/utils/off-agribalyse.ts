export const OFF_AGRIBALYSE_PROJECTION = {
  'environmental_score_data.agribalyse.code': 1,
  'ecoscore_data.agribalyse.code': 1,
};

export function offAgribalyseCode(
  product: Record<string, unknown>,
): string | undefined {
  for (const data of [
    product.environmental_score_data,
    product.ecoscore_data,
  ]) {
    const code = (data as { agribalyse?: { code?: unknown } } | undefined)
      ?.agribalyse?.code;
    if (typeof code === 'string' && code !== '') return code;
  }
  return undefined;
}

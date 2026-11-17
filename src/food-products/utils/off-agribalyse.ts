export const OFF_AGRIBALYSE_PROJECTION = {
  'environmental_score_data.agribalyse.code': 1,
  'ecoscore_data.agribalyse.code': 1,
};

export function offAgribalyseCode(
  product: Record<string, unknown>,
): string | undefined {
  const code = [product.environmental_score_data, product.ecoscore_data]
    .map(
      (data) =>
        (data as { agribalyse?: { code?: unknown } } | undefined)?.agribalyse
          ?.code,
    )
    .find((value) => typeof value === 'string' && value !== '');
  return code as string | undefined;
}

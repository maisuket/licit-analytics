export class SimilarityUtil {
  static calculate(str1: string, str2: string): number {
    const s1 = str1.replace(/\s+/g, '').toUpperCase();
    const s2 = str2.replace(/\s+/g, '').toUpperCase();

    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const bigrams1 = this.getBigrams(s1);
    const bigrams2 = this.getBigrams(s2);

    let intersection = 0;
    const map = new Map<string, number>();

    bigrams1.forEach((b) => map.set(b, (map.get(b) || 0) + 1));

    bigrams2.forEach((b) => {
      const count = map.get(b) || 0;
      if (count > 0) {
        intersection++;
        map.set(b, count - 1);
      }
    });

    return (2 * intersection) / (bigrams1.length + bigrams2.length);
  }

  private static getBigrams(str: string): string[] {
    // FIX TS2345: Definindo explicitamente o tipo do array para evitar inferência como 'never[]'
    const bigrams: string[] = [];
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
  }
}

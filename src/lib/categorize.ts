import { ExpenseCategory } from '@/types/expense';

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  Food: [
    'rewe', 'edeka', 'aldi', 'lidl', 'netto', 'penny', 'kaufland', 'norma',
    'restaurant', 'gastronomie', 'pizza', 'burger', 'sushi', 'cafe', 'kaffee',
    'bäckerei', 'backerei', 'metzger', 'lieferando', 'uber eats', 'mcdonalds',
    'starbucks', 'subway', 'döner', 'doner', 'imbiss', 'supermarkt', 'lebensmittel',
    'food', 'essen', 'getränke', 'getraenke', 'dm drogerie',
  ],
  Transportation: [
    'tankstelle', 'shell', 'aral', 'esso', 'jet', 'total', 'benzin', 'diesel',
    'db ', 'deutsche bahn', 'bahn', 'sbb', 'mvv', 'hvv', 'bvg', 'rnv', 'kvb',
    'uber', 'taxi', 'bolt', 'free now', 'flixbus', 'lufthansa', 'eurowings',
    'ryanair', 'parkhaus', 'parking', 'adac', 'kfz', 'auto', 'werkstatt',
    'tanken', 'mobilität', 'mobilitat', 'transport',
  ],
  Entertainment: [
    'netflix', 'spotify', 'amazon prime', 'disney', 'kino', 'cinema', 'theater',
    'konzert', 'museum', 'club', 'bar', 'lounge', 'streaming', 'playstation',
    'xbox', 'steam', 'nintendo', 'gaming', 'ticket', 'eventim', 'ticketmaster',
    'fitnessstudio', 'gym', 'sport', 'verein', 'freizeit', 'hobby',
  ],
  Shopping: [
    'amazon', 'ebay', 'zalando', 'otto', 'h&m', 'zara', 'mediamarkt', 'saturn',
    'ikea', 'möbel', 'moebel', 'kleidung', 'fashion', 'schuhe', 'elektronik',
    'apple', 'samsung', 'douglas', 'parfümerie', 'parfuemerie', 'online shop',
    'versand', 'paket', 'dhl', 'hermes', 'shop', 'store', 'einkauf',
  ],
  Bills: [
    'miete', 'rent', 'strom', 'gas', 'wasser', 'heizung', 'stadtwerke',
    'versicherung', 'insurance', 'allianz', 'huk', 'aok', 'tkk', 'barmer',
    'krankenkasse', 'telekom', 'vodafone', 'o2', '1&1', 'internet', 'telefon',
    'gez', 'rundfunk', 'hausgeld', 'nebenkosten', 'finanzamt', 'steuer',
    'rechnung', 'abrechnung', 'beitrag', 'gebühr', 'gebuehr', 'rate',
    'kredit', 'darlehen', 'hypothek', 'mlp',
  ],
  Other: [],
};

export function categorizeTransaction(
  purpose: string,
  remoteName: string,
  bookingText: string
): ExpenseCategory {
  const searchText = `${purpose} ${remoteName} ${bookingText}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Other') continue;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return category as ExpenseCategory;
      }
    }
  }

  return 'Other';
}

export function buildDescription(
  purpose: string,
  remoteName: string,
  bookingText: string
): string {
  // Prefer remote name + purpose for a human-readable description
  const parts: string[] = [];

  if (remoteName) parts.push(remoteName.trim());
  if (purpose && purpose !== remoteName) {
    // Truncate long purposes
    const cleaned = purpose.trim().substring(0, 100);
    parts.push(cleaned);
  }
  if (parts.length === 0 && bookingText) {
    parts.push(bookingText.trim());
  }

  return parts.join(' - ') || 'Bank transaction';
}

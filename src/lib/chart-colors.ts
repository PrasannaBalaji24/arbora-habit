// Color palette for chart categories - calm, dreamy violet/teal/amber/blue range
// These keep harmony with the app's design system without using literal red.

export const WASTED_CATEGORY_COLORS: Record<string, string> = {
  "Social Media": "hsl(15 80% 62%)",      // soft coral
  "Lying down / Lazy": "hsl(35 80% 58%)", // amber
  "Random browsing": "hsl(50 75% 58%)",   // honey
  "Gaming": "hsl(330 60% 62%)",           // dusty pink
  "Overthinking": "hsl(280 50% 62%)",     // muted violet
  "Unaccounted time": "hsl(230 15% 60%)", // neutral grey-blue
  "Other": "hsl(200 35% 55%)",            // soft blue-grey
};

export const HABIT_CATEGORY_COLORS: Record<string, string> = {
  Health: "hsl(160 55% 48%)",         // emerald
  Learning: "hsl(215 70% 58%)",       // blue
  Creative: "hsl(295 55% 62%)",       // fuchsia
  Productivity: "hsl(40 80% 58%)",    // amber
  Mindfulness: "hsl(265 55% 62%)",    // violet
  Social: "hsl(335 60% 65%)",         // pink
  Other: "hsl(230 15% 60%)",          // grey-blue
  Uncategorized: "hsl(230 15% 60%)",
};

const FALLBACK_PALETTE = [
  "hsl(260 55% 62%)",
  "hsl(170 60% 48%)",
  "hsl(35 80% 58%)",
  "hsl(215 70% 58%)",
  "hsl(295 55% 62%)",
  "hsl(160 55% 48%)",
  "hsl(335 60% 65%)",
  "hsl(50 75% 58%)",
];

export function colorForWastedCategory(name: string, idx = 0): string {
  return WASTED_CATEGORY_COLORS[name] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

export function colorForHabitCategory(name: string, idx = 0): string {
  return HABIT_CATEGORY_COLORS[name] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

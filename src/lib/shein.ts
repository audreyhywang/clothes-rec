/**
 * Deep link to SHEIN's own search results for a query — lets users see what
 * a recommended piece actually looks like without us hosting a product
 * catalog. No API/affiliate account needed, just their public search URL.
 */
export function sheinSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query.trim()).replace(/%20/g, "+");
  // shein.tw is the Taiwan storefront — matches this app's zh-Hant audience
  // and skips the www.shein.com -> shein.tw locale redirect.
  return `https://www.shein.tw/pdsearch/${encoded}/`;
}

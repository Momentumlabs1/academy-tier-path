// Locale-stable formatters so SSR and client produce identical output.
export function formatNumber(n: number): string {
  const [int, dec] = Math.abs(n).toString().split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = n < 0 ? "-" : "";
  return dec ? `${sign}${grouped}.${dec}` : `${sign}${grouped}`;
}

export function formatMoney(n: number, currency = "$"): string {
  return `${currency}${formatNumber(n)}`;
}

export function formatDate(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-").map((p) => parseInt(p, 10));
  return `${months[m - 1]} ${d}, ${y}`;
}
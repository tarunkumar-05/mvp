const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

function groupIndian(whole: string): string {
  if (whole.length <= 3) {
    return whole;
  }

  const lastThree = whole.slice(-3);
  let rest = whole.slice(0, -3);
  const groups: string[] = [];

  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) {
    groups.unshift(rest);
  }

  return `${groups.join(",")},${lastThree}`;
}

/** Deterministic INR formatting so server and client markup always match. */
export function formatINR(value: number, fractionDigits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(safe).toFixed(fractionDigits);
  const [whole, fraction] = fixed.split(".");
  const grouped = groupIndian(whole);
  const sign = safe < 0 ? "-" : "";

  return `${sign}\u20B9${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) {
    return "\u2014";
  }
  return Number.isInteger(value) ? `${value}s` : `${value.toFixed(2)}s`;
}

export function formatTimestamp(iso: string): string {
  const match = ISO_PATTERN.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day, hour, minute] = match;
  const label = MONTHS[Number(month) - 1] ?? month;
  return `${day} ${label} ${year}, ${hour}:${minute} UTC`;
}

export function formatDate(iso: string): string {
  const match = ISO_PATTERN.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day] = match;
  const label = MONTHS[Number(month) - 1] ?? month;
  return `${day} ${label} ${year}`;
}

export function companyFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? "";
  const root = domain.split(".")[0] ?? "";
  if (!root) {
    return "Customer";
  }
  return root.charAt(0).toUpperCase() + root.slice(1);
}

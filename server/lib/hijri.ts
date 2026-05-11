export type HijriParts = {
  year: number;
  month: number;
  monthName: string;
};

function parseNumberPart(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

export function getCurrentHijriParts(date = new Date()): HijriParts {
  const numericParts = new Intl.DateTimeFormat("en-u-ca-islamic", {
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const nameParts = new Intl.DateTimeFormat("ar-EG-u-ca-islamic", {
    month: "long",
  }).formatToParts(date);

  const year = parseNumberPart(numericParts.find((part) => part.type === "year")?.value ?? "");
  const month = parseNumberPart(numericParts.find((part) => part.type === "month")?.value ?? "");
  const monthName = nameParts.find((part) => part.type === "month")?.value ?? `شهر ${month || ""}`;

  return {
    year: year || new Date().getFullYear(),
    month: month || 1,
    monthName,
  };
}

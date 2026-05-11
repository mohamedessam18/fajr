export function formatMoney(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ar-EG")} جنيه`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

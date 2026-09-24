export type Row = Record<string, any>;

export type BrandingSnapshot = {
  companyNameAr: string;
  companyNameEn: string;
  logoSrc: string;
};

const apiFetch = async (path: string) => {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "تعذر تنفيذ الطلب");
  return body;
};

const firstString = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const normalizeSettings = (settings: any): Row[] => (Array.isArray(settings) ? settings : []);

export const brandingFromSources = (profile: Row | null | undefined, settingsRaw: any): BrandingSnapshot => {
  const settings = normalizeSettings(settingsRaw);
  const byKey = Object.fromEntries(settings.map((row) => [String(row.setting_key), row]));
  const settingLogo = firstString(byKey.company_logo_data_url?.setting_value);
  const profileLogo = firstString(profile?.logo_url);
  return {
    companyNameAr: firstString(profile?.name_ar, profile?.name, "MPBF"),
    companyNameEn: firstString(profile?.name, profile?.name_ar, "PLASTIC MANUFACTURING"),
    logoSrc: firstString(settingLogo, profileLogo),
  };
};

export const fetchBrandingSnapshot = async (): Promise<BrandingSnapshot> => {
  const fallback = brandingFromSources(null, []);
  const payload = await apiFetch("/public-branding").catch(() => null);
  if (!payload || typeof payload !== "object") return fallback;

  return {
    companyNameAr: firstString((payload as Row).companyNameAr, fallback.companyNameAr),
    companyNameEn: firstString((payload as Row).companyNameEn, fallback.companyNameEn),
    logoSrc: firstString((payload as Row).logoSrc),
  };
};

export const defaultBranding: BrandingSnapshot = {
  companyNameAr: "MPBF",
  companyNameEn: "PLASTIC MANUFACTURING",
  logoSrc: "",
};

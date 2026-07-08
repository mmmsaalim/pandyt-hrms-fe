export const SRI_LANKA_INDUSTRY_TYPES = [
  'IT Services',
  'BPO / Contact Centre',
  'Manufacturing',
  'Trading / Import Export',
  'Retail',
  'Hospitality',
  'Healthcare',
  'Education',
  'Construction',
  'Financial Services',
  'Agriculture',
  'Logistics',
  'Other',
] as const;

export const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
] as const;

export type TenantCompanyProfile = {
  brNumber?: string;
  registeredAddress?: string;
  city?: string;
  district?: string;
  industryType?: string;
  companyPhone?: string;
  companyEmail?: string;
  adminPhone?: string;
  tinNumber?: string;
  website?: string;
};

export function emptyCompanyProfile(): TenantCompanyProfile {
  return {
    brNumber: '',
    registeredAddress: '',
    city: '',
    district: '',
    industryType: '',
    companyPhone: '',
    companyEmail: '',
    adminPhone: '',
    tinNumber: '',
    website: '',
  };
}

export function companyProfileFromRow(row?: { companyProfile?: TenantCompanyProfile | null }): TenantCompanyProfile {
  const source = row?.companyProfile ?? {};
  return {
    brNumber: source.brNumber ?? '',
    registeredAddress: source.registeredAddress ?? '',
    city: source.city ?? '',
    district: source.district ?? '',
    industryType: source.industryType ?? '',
    companyPhone: source.companyPhone ?? '',
    companyEmail: source.companyEmail ?? '',
    adminPhone: source.adminPhone ?? '',
    tinNumber: source.tinNumber ?? '',
    website: source.website ?? '',
  };
}

export function companyProfilePayload(profile: TenantCompanyProfile): TenantCompanyProfile {
  return {
    brNumber: profile.brNumber?.trim() || undefined,
    registeredAddress: profile.registeredAddress?.trim() || undefined,
    city: profile.city?.trim() || undefined,
    district: profile.district?.trim() || undefined,
    industryType: profile.industryType?.trim() || undefined,
    companyPhone: profile.companyPhone?.trim() || undefined,
    companyEmail: profile.companyEmail?.trim() || undefined,
    adminPhone: profile.adminPhone?.trim() || undefined,
    tinNumber: profile.tinNumber?.trim() || undefined,
    website: profile.website?.trim() || undefined,
  };
}

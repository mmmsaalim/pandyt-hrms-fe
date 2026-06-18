export interface PayslipTemplateOption {
  key: string;
  label: string;
  description: string;
}

export const PAYSLIP_TEMPLATE_OPTIONS: PayslipTemplateOption[] = [
  {
    key: 'STANDARD_LKR',
    label: 'Standard LKR Payslip',
    description: 'Basic earnings, deductions, EPF/ETF summary.',
  },
  {
    key: 'DETAILED_LKR',
    label: 'Detailed LKR Payslip',
    description: 'Itemised allowances, canteen, loans, statutory breakdown.',
  },
  {
    key: 'COMPACT_LKR',
    label: 'Compact Payslip',
    description: 'Single-page minimal layout.',
  },
  {
    key: 'CUSTOM',
    label: 'Custom template',
    description: 'Company-specific format (platform catalog).',
  },
];

export const DEFAULT_PAYSLIP_TEMPLATE_KEY = 'STANDARD_LKR';

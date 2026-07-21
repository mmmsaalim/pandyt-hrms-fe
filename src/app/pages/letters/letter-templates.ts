export type LetterTypeValue =
  | 'GENERAL'
  | 'APPOINTMENT'
  | 'WARNING'
  | 'CONFIRMATION'
  | 'OFFER'
  | 'EXPERIENCE';

export interface LetterTemplate {
  value: LetterTypeValue;
  label: string;
  defaultTitle: string;
  subject: string;
  body: string;
}

export const LETTER_TYPES: LetterTemplate[] = [
  {
    value: 'GENERAL',
    label: 'General letter',
    defaultTitle: 'Official Letter',
    subject: 'General Communication',
    body: `Date: [Date]

To
[Employee Name]

Subject: [Subject]

Dear [Employee Name],

[Write the purpose of this letter here.]

We trust this matter will receive your immediate attention. Should you require any clarification, please contact the Human Resources department.

Yours faithfully,


_____________________________
[Authorized Signatory Name]
[Designation]
[Company Name]`,
  },
  {
    value: 'APPOINTMENT',
    label: 'Appointment letter',
    defaultTitle: 'Appointment Letter',
    subject: 'Appointment as [Job Title]',
    body: `Date: [Date]

To
[Employee Name]
[Address]

Subject: Appointment as [Job Title]

Dear [Employee Name],

We are pleased to appoint you to the position of [Job Title] at [Company Name], effective from [Start Date].

Your key employment details are as follows:

  • Position:           [Job Title]
  • Department:         [Department Name]
  • Reporting To:         [Manager Name]
  • Employment Type:      [Full-Time / Part-Time / Contract]
  • Salary:               [Salary Details]
  • Work Location:        [Location]

You are required to perform your duties diligently and in accordance with company policies, procedures, and applicable laws. This appointment is subject to satisfactory completion of any pre-employment requirements and submission of required documents.

Please sign and return a copy of this letter within [Number] working days as confirmation of your acceptance.

We look forward to a successful association with you.

Yours faithfully,


_____________________________
[Authorized Signatory Name]
[Designation]
[Company Name]`,
  },
  {
    value: 'OFFER',
    label: 'Offer letter',
    defaultTitle: 'Offer of Employment',
    subject: 'Offer of Employment — [Job Title]',
    body: `Date: [Date]

To
[Employee Name]
[Address]

Subject: Offer of Employment — [Job Title]

Dear [Employee Name],

Further to our recent discussions, we are pleased to offer you the position of [Job Title] at [Company Name], with a proposed start date of [Start Date].

The terms of your employment are outlined below:

  • Position:           [Job Title]
  • Department:         [Department Name]
  • Reporting To:         [Manager Name]
  • Employment Type:      [Full-Time / Part-Time / Contract]
  • Compensation:         [Salary Details]
  • Work Location:        [Location]
  • Probation Period:     [Duration, if applicable]

This offer is contingent upon verification of your credentials and completion of onboarding formalities. Please confirm your acceptance by signing and returning this letter by [Acceptance Deadline].

We are confident that your skills and experience will be a valuable addition to our team.

Yours faithfully,


_____________________________
[Authorized Signatory Name]
[Designation]
[Company Name]`,
  },
  {
    value: 'CONFIRMATION',
    label: 'Confirmation letter',
    defaultTitle: 'Confirmation of Employment',
    subject: 'Confirmation of Employment',
    body: `Date: [Date]

To
[Employee Name]

Subject: Confirmation of Employment

Dear [Employee Name],

We are pleased to confirm your employment with [Company Name] in the position of [Job Title], effective from [Confirmation Date].

Your probation period of [Probation Duration] has been completed satisfactorily. You will continue in your current role under the terms and conditions communicated at the time of your appointment, unless otherwise notified in writing.

We appreciate your dedication and contribution to the organization and wish you continued success.

Yours faithfully,


_____________________________
[Authorized Signatory Name]
[Designation]
[Company Name]`,
  },
  {
    value: 'WARNING',
    label: 'Warning letter',
    defaultTitle: 'Warning Letter',
    subject: 'Formal Warning — [Reason]',
    body: `Date: [Date]

To
[Employee Name]
[Employee ID]

Subject: Formal Warning — [Reason]

Dear [Employee Name],

This letter serves as a formal [First / Second / Final] warning regarding [brief description of the issue or misconduct].

Details of the concern:
[Describe the incident, dates, and policy violated.]

You are required to [corrective action expected] and ensure that such conduct is not repeated. Failure to improve may result in further disciplinary action, up to and including termination of employment, in accordance with company policy.

Please acknowledge receipt of this letter by signing below.

Yours faithfully,


_____________________________
[Authorized Signatory Name]
[Designation]
[Company Name]

Acknowledgement (Employee):
I acknowledge receipt of this warning letter.

Signature: _________________________    Date: _________________`,
  },
  {
    value: 'EXPERIENCE',
    label: 'Experience certificate',
    defaultTitle: 'Experience Certificate',
    subject: 'Experience Certificate',
    body: `Date: [Date]

To Whom It May Concern

Subject: Experience Certificate — [Employee Name]

This is to certify that [Employee Name] was employed with [Company Name] as [Job Title] in the [Department Name] department from [Join Date] to [Last Working Date].

During this period, [he/she/they] performed [his/her/their] duties with sincerity and professionalism. [Employee Name] possesses good technical and interpersonal skills and has been an asset to the organization.

We wish [Employee Name] every success in future endeavours.

For [Company Name]


_____________________________
[Authorized Signatory Name]
[Designation]
[Company Name]`,
  },
];

export const LETTER_TYPE_BY_VALUE = Object.fromEntries(
  LETTER_TYPES.map((item) => [item.value, item]),
) as Record<LetterTypeValue, LetterTemplate>;

export function letterTypeLabel(value: string): string {
  return LETTER_TYPE_BY_VALUE[value as LetterTypeValue]?.label ?? value.replace(/_/g, ' ');
}

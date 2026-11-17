export const CORPORATE_FAQ_CATEGORIES = [
  { id: 'employee-management', label: 'Employee Management' },
  { id: 'routes-trips', label: 'Routes & Trips' },
  { id: 'billing-payments', label: 'Billing & Payments' },
  { id: 'company-profile', label: 'Company Profile' },
  { id: 'support-tickets', label: 'Support & Tickets' },
  { id: 'account-login', label: 'Account & Login' },
] as const;

export type CorporateFaqCategoryId = (typeof CORPORATE_FAQ_CATEGORIES)[number]['id'];

export type CorporateFaqEntry = {
  id: string;
  category: CorporateFaqCategoryId;
  question: string;
  answer: string;
};

export const CORPORATE_FAQS: CorporateFaqEntry[] = [
  {
    id: 'employee-search',
    category: 'employee-management',
    question: 'How can I search or filter the employee directory?',
    answer: 'On Employees, search by name, employee ID, email, or phone. You can also filter by department, office, and employment status.',
  },
  {
    id: 'employee-add',
    category: 'employee-management',
    question: 'How do I add a new employee?',
    answer: 'The current Employees screen is a local preview. Adding an employee updates the preview for this session only and does not create a server-backed company record.',
  },
  {
    id: 'employee-deactivate',
    category: 'employee-management',
    question: 'How do I deactivate an employee?',
    answer: 'The Employees screen shows Active and Inactive statuses, but it does not provide a server-backed deactivation workflow. Its records are local preview data.',
  },
  {
    id: 'employee-preview',
    category: 'employee-management',
    question: 'Do employee imports and edits update company records?',
    answer: 'The current Employees screen is a local preview. Its import dialog says the selected file stays on this device and that import processing is not connected; directory changes are not sent to the server.',
  },
  {
    id: 'employee-export',
    category: 'employee-management',
    question: 'Can I export the employee directory?',
    answer: 'Yes. The Employees screen has an Export action that downloads the currently filtered directory as a CSV.',
  },
  {
    id: 'routes-list',
    category: 'routes-trips',
    question: 'What information is shown in the Routes list?',
    answer: 'The list shows route code and name, source, destination, stops, assigned employees, vehicle, and status. Search and status filters are available.',
  },
  {
    id: 'route-create',
    category: 'routes-trips',
    question: 'How can I create a new route?',
    answer: 'Use Create Route in Routes List to add a route to the current local preview. Route records are not sent to the server.',
  },
  {
    id: 'routes-preview',
    category: 'routes-trips',
    question: 'Are changes in the Routes list saved to the server?',
    answer: 'No. The current Routes List identifies its records as sample data stored locally in the session; create, edit, and delete actions affect that preview only.',
  },
  {
    id: 'live-trips',
    category: 'routes-trips',
    question: 'Where can I view active trips?',
    answer: 'The Live Operations map at /live requests routes with an IN_PROGRESS status. Selecting a route opens trip details with Info, Employees, and Timeline tabs. What appears depends on the route data available to the portal.',
  },
  {
    id: 'track-trip',
    category: 'routes-trips',
    question: 'How can I track an ongoing trip?',
    answer: 'Open Live Operations at /live to view routes reported as IN_PROGRESS. Select a route to see its available trip details and timeline.',
  },
  {
    id: 'invoice-list',
    category: 'billing-payments',
    question: 'Where can I review invoices and their status?',
    answer: 'Open Billing & Invoices and choose Invoice List. Selecting an invoice opens its details, including the available line items and amounts.',
  },
  {
    id: 'payment-status',
    category: 'billing-payments',
    question: 'How can I check payment status?',
    answer: 'Open Billing & Invoices and choose Invoice List. The Status column shows the status available for each invoice.',
  },
  {
    id: 'invoice-pdf',
    category: 'billing-payments',
    question: 'How do I download an invoice?',
    answer: 'Open the invoice from Invoice List or its details page and use the Download PDF action.',
  },
  {
    id: 'billing-dispute',
    category: 'billing-payments',
    question: 'How can I raise an invoice dispute?',
    answer: 'Open Billing Disputes or use the dispute action on an invoice. The form asks for a reason and claimed amount; an invoice line can also be selected.',
  },
  {
    id: 'profile-sections',
    category: 'company-profile',
    question: 'Which sections are available in Company Profile?',
    answer: 'The page provides Organization Details, Legal & Tax Details, Offices & Sites, Departments, Transport Zones, and Users & Roles.',
  },
  {
    id: 'company-update',
    category: 'company-profile',
    question: 'How can I update company information?',
    answer: 'Open Company Profile and use the edit controls for the relevant section. Available actions depend on the permissions associated with your account.',
  },
  {
    id: 'profile-permissions',
    category: 'company-profile',
    question: 'Why might an edit action be unavailable?',
    answer: 'Company Profile edit controls depend on the permissions associated with your account. The page checks separate permissions for tenant details, offices, departments, and user invitations.',
  },
  {
    id: 'create-ticket',
    category: 'support-tickets',
    question: 'How do I create and follow a support ticket?',
    answer: 'Open Support to create a ticket with a category, priority, and description. Existing tickets can be opened to view their details and conversation.',
  },
  {
    id: 'ticket-images',
    category: 'support-tickets',
    question: 'Can I attach images to a support ticket?',
    answer: 'Yes. The form accepts up to five JPG, JPEG, PNG, or WEBP images, with a maximum size of 5 MB per image.',
  },
  {
    id: 'login-options',
    category: 'account-login',
    question: 'Which sign-in options does the portal provide?',
    answer: 'The login page offers Company Phone OTP and Password. The password flow accepts an email address or mobile number; the OTP flow uses a company phone number.',
  },
  {
    id: 'otp-registration',
    category: 'account-login',
    question: 'Can I create a new account through the OTP login flow?',
    answer: 'No. The corporate portal requests OTPs for existing accounts only; account registration is not part of this login flow.',
  },
];

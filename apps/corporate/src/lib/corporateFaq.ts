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
    answer: 'Open Employees and click Add employee. Fill in the employee details, assigned office, and home pickup address, then save to create a live company record.',
  },
  {
    id: 'employee-deactivate',
    category: 'employee-management',
    question: 'How do I deactivate or delete an employee?',
    answer: 'From the Employees directory, use Deactivate/Activate to toggle an employee’s active status, or Delete to remove an employee record. Employees with historical trips or support tickets are safely deactivated instead of hard-deleted.',
  },
  {
    id: 'employee-preview',
    category: 'employee-management',
    question: 'Do employee edits update company records?',
    answer: 'Yes. Creating, editing (including updating the home address), activating/deactivating, or deleting employees saves directly to your tenant records through the Corporate API and syncs with the linked employee account.',
  },
  {
    id: 'employee-export',
    category: 'employee-management',
    question: 'Can I export the employee directory?',
    answer: 'Yes. The Employees screen has an Export action that downloads the currently displayed directory page as a CSV.',
  },
  {
    id: 'routes-list',
    category: 'routes-trips',
    question: 'What information is shown in Routes?',
    answer: 'The Routes view shows live corporate routes for your company, including route code, shift date and direction, stops, assigned employees, driver and vehicle details, and dispatch status.',
  },
  {
    id: 'route-create',
    category: 'routes-trips',
    question: 'How are corporate routes created and dispatched?',
    answer: 'Routes are generated from published shift rosters and dispatched to verified fleet partners through AdhocX operations. You can inspect each route’s stops, map directions, and status from the Routes section.',
  },
  {
    id: 'routes-preview',
    category: 'routes-trips',
    question: 'Are routes and trip details live data?',
    answer: 'Yes. The Routes and Live Operations views load live tenant route records, road directions, and active vehicle telemetry directly from the Corporate API.',
  },
  {
    id: 'live-trips',
    category: 'routes-trips',
    question: 'Where can I view active trips?',
    answer: 'Open Routes or Live Operations (/live) to monitor routes currently IN_TRANSIT. Selecting a route opens trip details with map telemetry, stops, passengers, and timeline tabs.',
  },
  {
    id: 'track-trip',
    category: 'routes-trips',
    question: 'How can I track an ongoing trip?',
    answer: 'Open Live Operations at /live or Routes > Active Routes to view routes currently IN_TRANSIT, and select any route to inspect its live GPS location, waypoints, and timeline.',
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
    answer: 'The page provides Organization Details, Legal & Tax Details, and Managers.',
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
    answer: 'Company Profile edit controls depend on the permissions associated with your account for organization details and offices.',
  },
  {
    id: 'create-ticket',
    category: 'support-tickets',
    question: 'How do I create and follow a support ticket?',
    answer: 'Open Support to create a ticket with a category, priority, and description, or open Employee Support to review, reply to, progress, and resolve employee commute tickets.',
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

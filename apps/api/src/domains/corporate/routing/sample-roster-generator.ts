import * as ExcelJS from 'exceljs';

const indiaDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(new Date());
const indiaDate = Object.fromEntries(indiaDateParts.map(({ type, value }) => [type, value]));
const sampleArrival = new Date(0);
sampleArrival.setUTCFullYear(Number(indiaDate.year), Number(indiaDate.month) - 1, Number(indiaDate.day) + 1);
sampleArrival.setUTCHours(0, 0, 0, 0);
const sampleArrivalDate = sampleArrival.toISOString().slice(0, 10);

export const SAMPLE_EMPLOYEE_ROSTER = [
  { employeeName: 'Aarav Sharma', pickupAddress: 'Aparna Sarovar Grande, Nallagandla, Gachibowli, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'MALE', phone: '+91 98765 43210' },
  { employeeName: 'Priya Reddy', pickupAddress: 'My Home Bhooja, Silpa Gram Craft Village, Madhapur, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'FEMALE', phone: '+91 98765 43211' },
  { employeeName: 'Rohan Verma', pickupAddress: 'Jayabheri Silicon County, Hitec City, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'MALE', phone: '+91 98765 43212' },
  { employeeName: 'Sneha Kulkarni', pickupAddress: 'Prestige High Fields, Financial District, Nanakramguda, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'FEMALE', phone: '+91 98765 43213' },
  { employeeName: 'Vikram Malhotra', pickupAddress: 'SMR Vinay City, Miyapur, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'MALE', phone: '+91 98765 43214' },
  { employeeName: 'Ananya Deshmukh', pickupAddress: 'Lodha Bellezza, Eden Square, Phase 4, KPHB Colony, Kukatpally, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'FEMALE', phone: '+91 98765 43215' },
  { employeeName: 'Karthik Raju', pickupAddress: 'Rainbow Vistas Rock Garden, IDL Access Road, Moosapet, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'MALE', phone: '+91 98765 43216' },
  { employeeName: 'Divya Nair', pickupAddress: 'Indis PBEL City, Peeramcheru, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'FEMALE', phone: '+91 98765 43217' },
  { employeeName: 'Siddharth Joshi', pickupAddress: 'Lanco Hills Apartments, Manikonda, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'MALE', phone: '+91 98765 43218' },
  { employeeName: 'Meera Iyer', pickupAddress: 'Road No 36, Jubilee Hills, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'FEMALE', phone: '+91 98765 43219' },
  { employeeName: 'Aditya Prasad', pickupAddress: 'Green Valley, Banjara Hills Road No 12, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'MALE', phone: '+91 98765 43220' },
  { employeeName: 'Kavita Menon', pickupAddress: 'Botanical Garden Road, Masjid Banda, Kondapur, Hyderabad', officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad', arrivalDate: sampleArrivalDate, arrivalTime: '08:00', gender: 'FEMALE', phone: '+91 98765 43221' },
];

export function generateSampleCsv(): string {
  const headers = ['employee_name', 'pickup_address', 'office_address', 'required_arrival_date', 'required_arrival_time', 'gender', 'phone_number'];
  const rows = SAMPLE_EMPLOYEE_ROSTER.map(
    (row) =>
      `"${row.employeeName}","${row.pickupAddress}","${row.officeAddress}","${row.arrivalDate}","${row.arrivalTime}","${row.gender}","${row.phone}"`,
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function generateSampleExcelBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AdhocX Corporate ETS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Employee Pickups', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'Employee Name *', key: 'employee_name', width: 24 },
    { header: 'Pickup Address *', key: 'pickup_address', width: 55 },
    { header: 'Office Address *', key: 'office_address', width: 55 },
    { header: 'Required Arrival Date * (YYYY-MM-DD)', key: 'required_arrival_date', width: 32 },
    { header: 'Required Arrival Time * (24h, IST)', key: 'required_arrival_time', width: 30 },
    { header: 'Gender (MALE/FEMALE)', key: 'gender', width: 22 },
    { header: 'Phone Number', key: 'phone_number', width: 20 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF5728B2' }, // AdhocX Electric Indigo
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  for (const item of SAMPLE_EMPLOYEE_ROSTER) {
    const row = worksheet.addRow({
      employee_name: item.employeeName,
      pickup_address: item.pickupAddress,
      office_address: item.officeAddress,
      required_arrival_date: item.arrivalDate,
      required_arrival_time: item.arrivalTime,
      gender: item.gender,
      phone_number: item.phone,
    });
    row.height = 22;
    row.alignment = { vertical: 'middle' };
  }

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}

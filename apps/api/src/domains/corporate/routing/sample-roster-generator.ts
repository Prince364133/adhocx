import * as ExcelJS from 'exceljs';

export const SAMPLE_EMPLOYEE_ROSTER = [
  { employeeName: 'Aarav Sharma', pickupAddress: 'Aparna Sarovar Grande, Nallagandla, Gachibowli, Hyderabad', gender: 'MALE', phone: '+91 98765 43210' },
  { employeeName: 'Priya Reddy', pickupAddress: 'My Home Bhooja, Silpa Gram Craft Village, Madhapur, Hyderabad', gender: 'FEMALE', phone: '+91 98765 43211' },
  { employeeName: 'Rohan Verma', pickupAddress: 'Jayabheri Silicon County, Hitec City, Hyderabad', gender: 'MALE', phone: '+91 98765 43212' },
  { employeeName: 'Sneha Kulkarni', pickupAddress: 'Prestige High Fields, Financial District, Nanakramguda, Hyderabad', gender: 'FEMALE', phone: '+91 98765 43213' },
  { employeeName: 'Vikram Malhotra', pickupAddress: 'SMR Vinay City, Miyapur, Hyderabad', gender: 'MALE', phone: '+91 98765 43214' },
  { employeeName: 'Ananya Deshmukh', pickupAddress: 'Lodha Bellezza, Eden Square, Phase 4, KPHB Colony, Kukatpally, Hyderabad', gender: 'FEMALE', phone: '+91 98765 43215' },
  { employeeName: 'Karthik Raju', pickupAddress: 'Rainbow Vistas Rock Garden, IDL Access Road, Moosapet, Hyderabad', gender: 'MALE', phone: '+91 98765 43216' },
  { employeeName: 'Divya Nair', pickupAddress: 'Indis PBEL City, Peeramcheru, Hyderabad', gender: 'FEMALE', phone: '+91 98765 43217' },
  { employeeName: 'Siddharth Joshi', pickupAddress: 'Lanco Hills Apartments, Manikonda, Hyderabad', gender: 'MALE', phone: '+91 98765 43218' },
  { employeeName: 'Meera Iyer', pickupAddress: 'Road No 36, Jubilee Hills, Hyderabad', gender: 'FEMALE', phone: '+91 98765 43219' },
  { employeeName: 'Aditya Prasad', pickupAddress: 'Green Valley, Banjara Hills Road No 12, Hyderabad', gender: 'MALE', phone: '+91 98765 43220' },
  { employeeName: 'Kavita Menon', pickupAddress: 'Botanical Garden Road, Masjid Banda, Kondapur, Hyderabad', gender: 'FEMALE', phone: '+91 98765 43221' },
];

export function generateSampleCsv(): string {
  const headers = ['employee_name', 'pickup_address', 'gender', 'phone_number'];
  const rows = SAMPLE_EMPLOYEE_ROSTER.map(
    (row) => `"${row.employeeName}","${row.pickupAddress}","${row.gender}","${row.phone}"`,
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
    { header: 'Gender (MALE/FEMALE)', key: 'gender', width: 22 },
    { header: 'Phone Number', key: 'phone_number', width: 20 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1167EE' }, // AdhocX Electric Indigo
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  for (const item of SAMPLE_EMPLOYEE_ROSTER) {
    const row = worksheet.addRow({
      employee_name: item.employeeName,
      pickup_address: item.pickupAddress,
      gender: item.gender,
      phone_number: item.phone,
    });
    row.height = 22;
    row.alignment = { vertical: 'middle' };
  }

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}


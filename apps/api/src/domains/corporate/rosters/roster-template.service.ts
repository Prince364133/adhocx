import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RosterTemplateService {
  /**
   * Generates the official locked corporate employee roster Excel template (.xlsx).
   */
  public async generateTemplateBuffer(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AdhocX Enterprise ETS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Roster_Template', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'employee_id*', key: 'employee_id', width: 18 },
      { header: 'full_name*', key: 'full_name', width: 24 },
      { header: 'email*', key: 'email', width: 28 },
      { header: 'phone_number*', key: 'phone_number', width: 18 },
      { header: 'gender*', key: 'gender', width: 14 },
      { header: 'department', key: 'department', width: 20 },
      { header: 'cost_center', key: 'cost_center', width: 18 },
      { header: 'office_code*', key: 'office_code', width: 16 },
      { header: 'roster_date*', key: 'roster_date', width: 16 },
      { header: 'login_time', key: 'login_time', width: 14 },
      { header: 'logout_time', key: 'logout_time', width: 14 },
      { header: 'home_address*', key: 'home_address', width: 36 },
      { header: 'landmark', key: 'landmark', width: 24 },
      { header: 'latitude', key: 'latitude', width: 14 },
      { header: 'longitude', key: 'longitude', width: 14 },
      { header: 'special_notes', key: 'special_notes', width: 24 },
    ];

    // Header styling: Midnight corporate navy background with white text
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Add illustrative example rows
    sheet.addRow({
      employee_id: 'EMP-1001',
      full_name: 'Ananya Sharma',
      email: 'ananya.s@companyx.com',
      phone_number: '9876543210',
      gender: 'FEMALE',
      department: 'Technology',
      cost_center: 'CC-TECH-01',
      office_code: 'HYD-HQ',
      roster_date: '2026-11-15',
      login_time: '08:00',
      logout_time: '17:00',
      home_address: 'Flat 402, Lotus Apts, Madhapur, Hyderabad',
      landmark: 'Near Cyber Towers',
      latitude: 17.448293,
      longitude: 78.374128,
      special_notes: 'None',
    });

    sheet.addRow({
      employee_id: 'EMP-1002',
      full_name: 'Vikram Patel',
      email: 'vikram.p@companyx.com',
      phone_number: '9876543211',
      gender: 'MALE',
      department: 'Finance',
      cost_center: 'CC-FIN-02',
      office_code: 'HYD-HQ',
      roster_date: '2026-11-15',
      login_time: '08:00',
      logout_time: '17:00',
      home_address: 'Plot 12, Road 36, Jubilee Hills, Hyderabad',
      landmark: 'Near Peddamma Temple',
      latitude: 17.431200,
      longitude: 78.407800,
      special_notes: 'None',
    });

    // Instructions Sheet
    const infoSheet = workbook.addWorksheet('Instructions');
    infoSheet.columns = [
      { header: 'Rule', key: 'rule', width: 25 },
      { header: 'Description', key: 'desc', width: 75 },
    ];
    infoSheet.addRow({
      rule: 'Mandatory Fields (*)',
      desc: 'Fields marked with * (employee_id, full_name, email, phone_number, gender, office_code, roster_date, home_address) are required.',
    });
    infoSheet.addRow({
      rule: 'Shift Times',
      desc: 'Provide login_time (e.g. 08:00) for morning pickup, logout_time (e.g. 17:00) for evening drop, or both in 24-hour HH:mm format.',
    });
    infoSheet.addRow({
      rule: 'Gender Safety Rule',
      desc: 'Allowed values: MALE, FEMALE, OTHER. Critical for automated night-shift female escort safety routing.',
    });
    infoSheet.addRow({
      rule: 'Coordinates',
      desc: 'Optional. If left blank, the AdhocX engine automatically geocodes residential addresses using Google Maps Platform.',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

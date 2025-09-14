import path from 'path';
import startTables from '../utils/initializeDatabase.js';
import ImpUploadService from '../services/impUpload.services.js';

async function main() {
  try {
    await startTables();
    const service = new ImpUploadService();
    const filePath = path.resolve(process.cwd(), 'uploads/imp-test.csv');
    const themeNumber = parseInt(process.argv[2] || '1');
    const res = await service.uploadImpExam(filePath, {
      themeNumber,
      themeName: `${themeNumber}_IMP`,
      windowStartDate: new Date().toISOString(),
      autoRelease: true,
      immediatelyAvailable: true,
    });
    console.log('Upload result:', res);
  } catch (e) {
    console.error('IMP upload failed:', e);
  } finally {
    process.exit(0);
  }
}

main();

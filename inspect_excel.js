const XLSX = require('xlsx');
const path = require('path');

const inputFile = '/home/will/workspace/my-girl/时珍零售erp商品(1).xlsx';
const wb = XLSX.readFile(inputFile, {sheetRows: 10});
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});

console.log('Sheet name:', wb.SheetNames[0]);
console.log('Total rows:', data.length);
console.log('Total columns:', data[0] ? data[0].length : 0);
console.log();
console.log('First 5 rows:');
data.slice(0, 5).forEach((row, i) => console.log('Row', i+1, ':', JSON.stringify(row)));
console.log();
console.log('D column (index 3) header:', data[0][3]);
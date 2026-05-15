const XLSX = require('xlsx');

const inputFile = '/home/will/workspace/my-girl/时珍零售erp商品(1).xlsx';
const outputFile = '/home/will/workspace/my-girl/时珍零售erp商品(1)_去重1.xlsx';

const wb = XLSX.readFile(inputFile);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});

const header = data[0];
const body = data.slice(1);

console.log(`原始数据: ${body.length} 行, ${header.length} 列`);

const dColIndex = 3;

const groups = new Map();
for (const row of body) {
    const dValue = row[dColIndex];
    if (!groups.has(dValue)) {
        groups.set(dValue, []);
    }
    groups.get(dValue).push(row);
}

const deduplicated = [];
let duplicatesRemoved = 0;

for (const [dValue, rows] of groups) {
    if (rows.length === 1) {
        deduplicated.push(rows[0]);
    } else {
        const allSame = rows.every(row => {
            for (let i = 0; i < row.length; i++) {
                if (row[i] !== rows[0][i]) return false;
            }
            return true;
        });

        if (allSame) {
            deduplicated.push(rows[0]);
            duplicatesRemoved += rows.length - 1;
        } else {
            rows.forEach(row => deduplicated.push(row));
        }
    }
}

const resultData = [header, ...deduplicated];
const resultWs = XLSX.utils.aoa_to_sheet(resultData);
const resultWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(resultWb, resultWs, wb.SheetNames[0]);
XLSX.writeFile(resultWb, outputFile);

console.log(`去重后数据: ${deduplicated.length} 行`);
console.log(`移除重复: ${duplicatesRemoved} 行`);
console.log(`输出文件: ${outputFile}`);
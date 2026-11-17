const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const { Sequelize, DataTypes, QueryTypes, Op } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Database SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite', 
    logging: false
});

// Model 1: Data Pelatihan (Bangkom)
const TrainingRecord = sequelize.define('TrainingRecord', {
    nip: { type: DataTypes.STRING },
    nama: { type: DataTypes.STRING },
    instansi: { type: DataTypes.STRING },
    jabatan: { type: DataTypes.STRING },
    unit_kerja: { type: DataTypes.STRING },
    mulai_diklat: { type: DataTypes.DATEONLY },
    akhir_diklat: { type: DataTypes.DATEONLY },
    nama_diklat: { type: DataTypes.TEXT },
    jam_pelajaran: { type: DataTypes.INTEGER }
}, {
    tableName: 'training_records',
    timestamps: false
});

// Model 2: Data Survei Kepuasan (Dinamis untuk Banyak Kolom)
const SurveyRecord = sequelize.define('SurveyRecord', {
    row_data: { type: DataTypes.TEXT } // Menyimpan seluruh kolom baris Excel dalam bentuk JSON
}, {
    tableName: 'survey_records',
    timestamps: false
});

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ dest: 'uploads/' });

const cleanText = (text) => {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[Â\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
};

// Fungsi Konversi Jawaban Survei (Teks/Angka) ke Skor 1 - 5
const parseLikertScore = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number' && val >= 1 && val <= 5) return val;
    
    const str = String(val).trim().toLowerCase();
    const num = Number(str);
    if (!isNaN(num) && str !== '' && num >= 1 && num <= 5) return num;

    if (str.includes('sangat puas') || str.includes('sangat setuju') || str.includes('sangat baik') || str.includes('sangat sesuai') || str.includes('sangat bermanfaat')) return 5;
    if (str.includes('tidak puas') || str.includes('tidak setuju') || str.includes('tidak baik') || str.includes('tidak sesuai')) {
        return str.includes('sangat') ? 1 : 2;
    }
    if (str.includes('kurang')) return 2;
    if (str.includes('cukup') || str.includes('netral') || str.includes('ragu')) return 3;
    if (str.includes('puas') || str.includes('setuju') || str.includes('baik') || str.includes('sesuai') || str.includes('bermanfaat')) return 4;

    return null;
};

// ============================================================================
// ENDPOINT BANGKOM (PELATIHAN)
// ============================================================================

app.get('/api/dashboard', async (req, res) => {
    try {
        const totalRecords = await TrainingRecord.count();
        const employees = await sequelize.query(
            'SELECT nip, SUM(jam_pelajaran) as total_jp FROM training_records GROUP BY nip',
            { type: QueryTypes.SELECT }
        );

        const totalPegawai = employees.length;
        const memenuhi = employees.filter(e => e.total_jp >= 20).length;
        const belumMemenuhi = totalPegawai - memenuhi;
        
        const totalKeseluruhanJP = employees.reduce((sum, emp) => sum + (emp.total_jp || 0), 0);
        const rataRataJP = totalPegawai > 0 ? (totalKeseluruhanJP / totalPegawai).toFixed(1) : 0;

        const trend = await sequelize.query(
            `SELECT strftime('%Y-%m', mulai_diklat) as bulan, COUNT(DISTINCT nip) as total_peserta 
             FROM training_records WHERE mulai_diklat IS NOT NULL GROUP BY bulan ORDER BY bulan ASC`,
            { type: QueryTypes.SELECT }
        );

        const topUnitKerja = await sequelize.query(
            `SELECT unit_kerja, SUM(jam_pelajaran) as total_jp 
             FROM training_records WHERE unit_kerja IS NOT NULL AND unit_kerja != '' 
             GROUP BY unit_kerja ORDER BY total_jp DESC LIMIT 5`,
            { type: QueryTypes.SELECT }
        );

        const topDiklat = await sequelize.query(
            `SELECT nama_diklat, COUNT(nip) as total_peserta 
             FROM training_records WHERE nama_diklat IS NOT NULL AND nama_diklat != '' 
             GROUP BY nama_diklat ORDER BY total_peserta DESC LIMIT 5`,
            { type: QueryTypes.SELECT }
        );

        const topPegawai = await sequelize.query(
            `SELECT nip, nama, unit_kerja, SUM(jam_pelajaran) as total_jp, COUNT(id) as total_kegiatan 
             FROM training_records 
             GROUP BY nip, nama, unit_kerja 
             ORDER BY total_jp DESC 
             LIMIT 10`,
            { type: QueryTypes.SELECT }
        );

        res.json({
            totalRecords,
            totalPegawai,
            memenuhi,
            belumMemenuhi,
            rataRataJP,
            chartBulan: trend.map(t => t.bulan),
            chartPeserta: trend.map(t => t.total_peserta),
            topUnitKerjaLabels: topUnitKerja.map(t => t.unit_kerja),
            topUnitKerjaData: topUnitKerja.map(t => t.total_jp),
            topDiklatLabels: topDiklat.map(t => t.nama_diklat),
            topDiklatData: topDiklat.map(t => t.total_peserta),
            topPegawai
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/custom-chart', async (req, res) => {
    try {
        const { groupBy, metric, limit } = req.query;

        const allowedGroupBy = {
            'unit_kerja': 'unit_kerja',
            'jabatan': 'jabatan',
            'instansi': 'instansi',
            'nama_diklat': 'nama_diklat',
            'bulan': "strftime('%Y-%m', mulai_diklat)"
        };

        const allowedMetrics = {
            'sum_jp': 'SUM(jam_pelajaran)',
            'avg_jp': 'ROUND(AVG(jam_pelajaran), 1)',
            'count_records': 'COUNT(id)',
            'count_employees': 'COUNT(DISTINCT nip)'
        };

        const groupCol = allowedGroupBy[groupBy];
        const metricExp = allowedMetrics[metric];
        const rowLimit = Math.min(Math.max(parseInt(limit) || 5, 3), 25);

        if (!groupCol || !metricExp) {
            return res.status(400).json({ error: 'Parameter grup atau metrik tidak valid.' });
        }

        const orderClause = groupBy === 'bulan' ? 'label ASC' : 'value DESC';

        const query = `
            SELECT ${groupCol} as label, ${metricExp} as value
            FROM training_records
            WHERE ${groupCol} IS NOT NULL AND ${groupCol} != ''
            GROUP BY label
            ORDER BY ${orderClause}
            LIMIT ${rowLimit}
        `;

        const results = await sequelize.query(query, { type: QueryTypes.SELECT });

        res.json({
            labels: results.map(r => r.label),
            data: results.map(r => r.value)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload', upload.single('file_excel'), async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet);

        const records = rawData.map(row => ({
            nip: String(row['NIP'] || row['nip'] || ''),
            nama: cleanText(row['NAMA'] || row['nama']),
            instansi: cleanText(row['INSTANSI PENYELENGGARA DIKLAT'] || row['instansi']),
            jabatan: cleanText(row['JABATAN'] || row['jabatan']),
            unit_kerja: cleanText(row['UNIT KERJA'] || row['unit_kerja']),
            mulai_diklat: row['MULAI DIKLAT'] || null,
            akhir_diklat: row['AKHIR DIKLAT'] || null,
            nama_diklat: cleanText(row['NAMA DIKLAT'] || row['nama_diklat']),
            jam_pelajaran: parseInt(row['JAM PELAJARAN'] || row['jam_pelajaran'] || 0)
        })).filter(r => r.nip);

        await TrainingRecord.sync(); 
        await TrainingRecord.destroy({ where: {} }); 
        await TrainingRecord.bulkCreate(records);
        fs.unlinkSync(req.file.path); 
        res.json({ success: true, message: `Berhasil memproses ${records.length} baris data pelatihan.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const whereClause = search ? {
            [Op.or]: [
                { nip: { [Op.like]: `%${search}%` } },
                { nama: { [Op.like]: `%${search}%` } },
                { unit_kerja: { [Op.like]: `%${search}%` } },
                { jabatan: { [Op.like]: `%${search}%` } },
                { instansi: { [Op.like]: `%${search}%` } }
            ]
        } : {};

        const { count, rows } = await TrainingRecord.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [['id', 'DESC']]
        });

        res.json({ totalData: count, currentPage: page, totalPages: Math.ceil(count / limit), data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/records/all', async (req, res) => {
    try {
        const rows = await TrainingRecord.findAll({ order: [['id', 'DESC']] });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINT SURVEI KEPUASAN (DINAMIS MULTI-KOLOM)
// ============================================================================

app.post('/api/survey/upload', upload.single('file_survey'), async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path, { cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        const cleanedRecords = rawData.map(row => {
            const cleanObj = {};
            Object.keys(row).forEach(key => {
                const cleanedKey = cleanText(key);
                if (cleanedKey) {
                    cleanObj[cleanedKey] = cleanText(row[key]);
                }
            });
            return { row_data: JSON.stringify(cleanObj) };
        });

        await SurveyRecord.sync();
        await SurveyRecord.destroy({ where: {} });
        await SurveyRecord.bulkCreate(cleanedRecords);
        fs.unlinkSync(req.file.path);

        res.json({ success: true, message: `Berhasil mengunggah ${cleanedRecords.length} responden survei kepuasan.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/survey/dashboard', async (req, res) => {
    try {
        const rows = await SurveyRecord.findAll();
        const parsedRows = rows.map(r => JSON.parse(r.row_data));
        const totalResponden = parsedRows.length;

        if (totalResponden === 0) {
            return res.json({
                totalResponden: 0,
                columns: [],
                questionStats: [],
                overallAverage: 0,
                overallIndexPercent: 0,
                distribution: { 'Sangat Puas (5)': 0, 'Puas (4)': 0, 'Cukup (3)': 0, 'Kurang (2)': 0, 'Tidak Puas (1)': 0 }
            });
        }

        const columns = Object.keys(parsedRows[0]);
        const questionStats = [];
        const distribution = {
            'Sangat Puas (5)': 0,
            'Puas (4)': 0,
            'Cukup (3)': 0,
            'Kurang (2)': 0,
            'Tidak Puas (1)': 0
        };

        let grandTotalScore = 0;
        let grandTotalCount = 0;

        // Cek setiap kolom, apakah berisi nilai kepuasan/skala Likert
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            // Lewati kolom identitas umum
            if (lowerCol === 'no' || lowerCol.includes('nip') || lowerCol.includes('timestamp') || lowerCol.includes('waktu') || lowerCol.includes('email') || lowerCol.includes('telepon') || lowerCol.includes('hp')) {
                return;
            }

            let sum = 0;
            let validCount = 0;

            parsedRows.forEach(row => {
                const score = parseLikertScore(row[col]);
                if (score !== null) {
                    sum += score;
                    validCount++;
                    grandTotalScore += score;
                    grandTotalCount++;

                    if (score === 5) distribution['Sangat Puas (5)']++;
                    else if (score === 4) distribution['Puas (4)']++;
                    else if (score === 3) distribution['Cukup (3)']++;
                    else if (score === 2) distribution['Kurang (2)']++;
                    else if (score === 1) distribution['Tidak Puas (1)']++;
                }
            });

            // Jika minimal 30% baris pada kolom ini memiliki skor kepuasan valid, masukkan sebagai Pertanyaan Survei
            if (validCount >= Math.max(1, totalResponden * 0.3)) {
                questionStats.push({
                    question: col,
                    avgScore: Number((sum / validCount).toFixed(2)),
                    respondents: validCount
                });
            }
        });

        const overallAverage = grandTotalCount > 0 ? Number((grandTotalScore / grandTotalCount).toFixed(2)) : 0;
        const overallIndexPercent = Number(((overallAverage / 5) * 100).toFixed(1));

        res.json({
            totalResponden,
            columns,
            questionStats,
            overallAverage,
            overallIndexPercent,
            distribution
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/survey/records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').toLowerCase();

        const allRows = await SurveyRecord.findAll({ order: [['id', 'ASC']] });
        let parsed = allRows.map(r => ({ id: r.id, ...JSON.parse(r.row_data) }));

        const columns = parsed.length > 0 ? Object.keys(parsed[0]).filter(k => k !== 'id') : [];

        if (search) {
            parsed = parsed.filter(item =>
                Object.values(item).some(val => String(val).toLowerCase().includes(search))
            );
        }

        const totalData = parsed.length;
        const paginatedData = parsed.slice(offset, offset + limit);

        res.json({
            totalData,
            currentPage: page,
            totalPages: Math.ceil(totalData / limit) || 1,
            columns,
            data: paginatedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/survey/all', async (req, res) => {
    try {
        const allRows = await SurveyRecord.findAll({ order: [['id', 'ASC']] });
        const parsed = allRows.map(r => JSON.parse(r.row_data));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

sequelize.sync().then(() => {
    const server = app.listen(3000, () => {
        console.log('\nSUKSES: Backend berjalan di http://localhost:3000');
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') console.error('\nERROR: Port 3000 sudah dipakai.');
        else console.error('\nERROR SERVER:', err);
    });
}).catch(err => console.error('\nGAGAL:', err));
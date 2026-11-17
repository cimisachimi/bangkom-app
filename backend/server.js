const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Database SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite', 
    logging: false
});

// Definisi Model
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

// Setup Multer
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ dest: 'uploads/' });

// API 1: Dashboard
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

        const trend = await sequelize.query(
            `SELECT strftime('%Y-%m', mulai_diklat) as bulan, COUNT(DISTINCT nip) as total_peserta 
             FROM training_records 
             WHERE mulai_diklat IS NOT NULL 
             GROUP BY bulan ORDER BY bulan ASC`,
            { type: QueryTypes.SELECT }
        );

        res.json({
            totalRecords,
            totalPegawai,
            memenuhi,
            belumMemenuhi,
            chartBulan: trend.map(t => t.bulan),
            chartPeserta: trend.map(t => t.total_peserta)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API 2: Upload Excel
app.post('/api/upload', upload.single('file_excel'), async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet);

        const records = rawData.map(row => ({
            nip: String(row['NIP'] || row['nip'] || ''),
            nama: row['NAMA'] || row['nama'] || '',
            instansi: row['INSTANSI PENYELENGGARA DIKLAT'] || row['instansi'] || '',
            jabatan: row['JABATAN'] || row['jabatan'] || '',
            unit_kerja: row['UNIT KERJA'] || row['unit_kerja'] || '',
            mulai_diklat: row['MULAI DIKLAT'] || null,
            akhir_diklat: row['AKHIR DIKLAT'] || null,
            nama_diklat: row['NAMA DIKLAT'] || row['nama_diklat'] || '',
            jam_pelajaran: parseInt(row['JAM PELAJARAN'] || row['jam_pelajaran'] || 0)
        })).filter(r => r.nip);

        await TrainingRecord.sync(); 
        await TrainingRecord.destroy({ where: {} }); 
        await TrainingRecord.bulkCreate(records);

        fs.unlinkSync(req.file.path); 
        res.json({ success: true, message: `Berhasil memproses ${records.length} baris data.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API 3: Raw Data (Paginasi)
app.get('/api/records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        const { count, rows } = await TrainingRecord.findAndCountAll({
            limit: limit,
            offset: offset,
            order: [['id', 'DESC']]
        });

        res.json({
            totalData: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            data: rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Startup Server & Penangkap Error
sequelize.sync()
    .then(() => {
        const server = app.listen(3000, () => {
            console.log('\nSUKSES: Backend Express berjalan di http://localhost:3000');
            console.log('Server standby... (Biarkan terminal ini terbuka, JANGAN tekan Ctrl+C)\n');
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error('\nERROR: Port 3000 sudah dipakai aplikasi lain. Matikan server lama dengan "npx kill-port 3000".');
            } else {
                console.error('\nERROR SERVER:', err);
            }
        });
    })
    .catch((err) => {
        console.error('\nGAGAL MEMBUAT DATABASE SQLITE:', err);
    });

process.on('uncaughtException', function (err) {
    console.error('\nERROR MENDADAK:', err);
});
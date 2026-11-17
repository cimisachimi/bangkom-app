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
    storage: './database.sqlite', // File database akan otomatis terbuat di direktori ini
    logging: false
});

// Definisi Model / Tabel
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

// Setup Multer untuk Upload File (menyimpan sementara)
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ dest: 'uploads/' });

// API Endpoint: Upload Excel
app.post('/api/upload', upload.single('file_excel'), async (req, res) => {
    try {
        // Baca excel (cellDates: true agar format tanggal Excel tidak rusak)
        const workbook = xlsx.readFile(req.file.path, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet);

        // Map data agar sesuai dengan header di database
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
        })).filter(r => r.nip); // Buang baris yang tidak memiliki NIP

        await TrainingRecord.sync(); // Buat tabel jika belum ada
        await TrainingRecord.destroy({ where: {} }); // Hapus data lama agar diganti dengan data Excel terbaru
        
        // Bulk insert (Sangat cepat untuk memproses puluhan ribu baris)
        await TrainingRecord.bulkCreate(records);

        fs.unlinkSync(req.file.path); // Hapus file temporary setelah berhasil disimpan ke DB
        res.json({ success: true, message: `Berhasil memproses ${records.length} baris data.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Endpoint: Dashboard Data
app.get('/api/dashboard', async (req, res) => {
    try {
        const totalRecords = await TrainingRecord.count();

        // Agregasi JP per pegawai
        const employees = await sequelize.query(
            'SELECT nip, SUM(jam_pelajaran) as total_jp FROM training_records GROUP BY nip',
            { type: QueryTypes.SELECT }
        );

        const totalPegawai = employees.length;
        const memenuhi = employees.filter(e => e.total_jp >= 20).length;
        const belumMemenuhi = totalPegawai - memenuhi;

        // Tren Bulanan (menggunakan strftime khusus SQLite)
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

// Jalankan Server & Sinkronisasi DB
sequelize.sync().then(() => {
    app.listen(3000, () => console.log('Backend Express berjalan di http://localhost:3000'));
});
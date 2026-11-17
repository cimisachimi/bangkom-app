import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDashboard = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard');
      setData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    }
  };

  const fetchRawData = async (pageNumber = 1) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/records?page=${pageNumber}`);
      setRecords(response.data.data);
      setPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
      setTotalRecords(response.data.totalData);
    } catch (error) {
      console.error("Error fetching raw data", error);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'rawdata') {
      fetchRawData(page);
    }
  }, [activeTab, page]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file_excel', file);

    try {
      const res = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      fetchDashboard(); 
      if (activeTab === 'rawdata') fetchRawData(1);
    } catch (error) {
      setMessage('Gagal mengupload file.');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-lg font-bold text-gray-800">Bangkom App</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('rawdata')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'rawdata' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Data Mentah
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* NAVBAR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {activeTab === 'dashboard' ? 'Visualisasi Dashboard' : 'Data Mentah (Database)'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600 hidden sm:block">Administrator</span>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
              AD
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN AREA */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* PANEL UPLOAD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Perbarui Data Bangkom</h3>
                <p className="text-gray-500 text-sm">Unggah file Excel (.xlsx) untuk memperbarui seluruh database</p>
              </div>
              <form onSubmit={handleUpload} className="flex w-full md:w-auto gap-2">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={(e) => setFile(e.target.files[0])} 
                  className="flex-1 md:flex-none border border-gray-300 p-2 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required 
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors"
                >
                  {loading ? (
                    'Memproses...'
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* NOTIFIKASI */}
            {message && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg shadow-sm flex items-center">
                <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {message}
              </div>
            )}

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && data && (
              <div className="animate-fade-in space-y-6">
                
                {/* WIDGET KARTU */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">Total Pegawai</p>
                    <h2 className="text-3xl font-bold text-gray-800 mt-2">{data.totalPegawai.toLocaleString()}</h2>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">Memenuhi 20 JP</p>
                    <div className="flex items-end justify-between mt-2">
                      <h2 className="text-3xl font-bold text-green-600">{data.memenuhi.toLocaleString()}</h2>
                      <p className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                        {data.totalPegawai ? ((data.memenuhi/data.totalPegawai)*100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">Belum Memenuhi</p>
                    <h2 className="text-3xl font-bold text-red-600 mt-2">{data.belumMemenuhi.toLocaleString()}</h2>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                    <p className="text-gray-500 text-sm font-medium">Total Record Pelatihan</p>
                    <h2 className="text-3xl font-bold text-gray-800 mt-2">{data.totalRecords.toLocaleString()}</h2>
                  </div>
                </div>

                {/* AREA GRAFIK */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Tren Peserta Pelatihan Bulanan</h3>
                    <div className="h-72 flex items-center justify-center">
                      <Bar 
                        options={{ maintainAspectRatio: false }}
                        data={{
                          labels: data.chartBulan,
                          datasets: [{
                            label: 'Jumlah Peserta Unik',
                            data: data.chartPeserta,
                            backgroundColor: 'rgba(59, 130, 246, 0.9)',
                            borderRadius: 6
                          }]
                        }} 
                      />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Rasio Pemenuhan JP</h3>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-full max-w-[240px]">
                        <Doughnut 
                          data={{
                            labels: ['Memenuhi (≥20 JP)', 'Belum Memenuhi'],
                            datasets: [{
                              data: [data.memenuhi, data.belumMemenuhi],
                              backgroundColor: ['#22c55e', '#ef4444'],
                              borderWidth: 0,
                              hoverOffset: 4
                            }]
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DATA MENTAH */}
            {activeTab === 'rawdata' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-800">Tabel Database Riwayat Pelatihan</h3>
                  <span className="text-sm bg-blue-50 text-blue-700 py-1.5 px-4 rounded-lg font-medium border border-blue-100">
                    Total: {totalRecords.toLocaleString()} Baris Data
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">NIP</th>
                        <th className="px-6 py-4 font-semibold">Nama Pegawai</th>
                        <th className="px-6 py-4 font-semibold">Unit Kerja</th>
                        <th className="px-6 py-4 font-semibold">Nama Diklat</th>
                        <th className="px-6 py-4 font-semibold">Tgl Mulai</th>
                        <th className="px-6 py-4 font-semibold text-center">JP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.length > 0 ? records.map((rec) => (
                        <tr key={rec.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{rec.nip}</td>
                          <td className="px-6 py-4">{rec.nama}</td>
                          <td className="px-6 py-4">{rec.unit_kerja}</td>
                          <td className="px-6 py-4">
                            <div className="truncate max-w-[200px]" title={rec.nama_diklat}>
                              {rec.nama_diklat}
                            </div>
                          </td>
                          <td className="px-6 py-4">{rec.mulai_diklat}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">
                              {rec.jam_pelajaran}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="text-center py-10 text-gray-500">
                            Belum ada data di database. Silakan unggah file Excel.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINASI */}
                <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-gray-600">
                    Halaman <span className="font-bold text-gray-900">{page}</span> dari <span className="font-bold text-gray-900">{totalPages}</span>
                  </span>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function App() {
  const [data, setData] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDashboard = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard');
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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
      fetchDashboard(); // Refresh data setelah upload
    } catch (error) {
      setMessage('Gagal mengupload file.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Form Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Bangkom (React + Express)</h1>
            <p className="text-gray-500 text-sm">Upload Excel untuk memperbarui data</p>
          </div>
          <form onSubmit={handleUpload} className="flex gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={(e) => setFile(e.target.files[0])} 
              className="border p-2 rounded text-sm"
              required 
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Upload Data'}
            </button>
          </form>
        </div>

        {message && (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6 shadow-sm">
            {message}
          </div>
        )}

        {data ? (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-blue-500">
                <p className="text-gray-500 text-sm">Total Pegawai</p>
                <h2 className="text-3xl font-bold">{data.totalPegawai.toLocaleString()}</h2>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-green-500">
                <p className="text-gray-500 text-sm">Memenuhi 20 JP</p>
                <h2 className="text-3xl font-bold text-green-600">{data.memenuhi.toLocaleString()}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {data.totalPegawai ? ((data.memenuhi/data.totalPegawai)*100).toFixed(1) : 0}% dari Total
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500">
                <p className="text-gray-500 text-sm">Belum Memenuhi</p>
                <h2 className="text-3xl font-bold text-red-600">{data.belumMemenuhi.toLocaleString()}</h2>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-500">
                <p className="text-gray-500 text-sm">Total Record</p>
                <h2 className="text-3xl font-bold">{data.totalRecords.toLocaleString()}</h2>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border lg:col-span-2">
                <h3 className="text-lg font-bold mb-4">Tren Peserta per Bulan</h3>
                <Bar 
                  data={{
                    labels: data.chartBulan,
                    datasets: [{
                      label: 'Peserta',
                      data: data.chartPeserta,
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    }]
                  }} 
                />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col items-center">
                <h3 className="text-lg font-bold mb-4 w-full text-left">Rasio Pemenuhan JP</h3>
                <div className="w-2/3">
                  <Doughnut 
                    data={{
                      labels: ['Memenuhi', 'Belum Memenuhi'],
                      datasets: [{
                        data: [data.memenuhi, data.belumMemenuhi],
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderWidth: 0
                      }]
                    }} 
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">Memuat data dashboard...</p>
        )}
      </div>
    </div>
  );
}

export default App;
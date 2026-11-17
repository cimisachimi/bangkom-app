import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
);

const DEFAULT_WIDGET_CONFIG = {
  showUploadPanel: true,
  showSummaryCards: true,
  showTrendChart: true,
  showRatioChart: true,
  showTopUnitChart: true,
  showTopDiklatChart: true,
  showTopPegawaiTable: true,
  trendChartType: 'bar',
  ratioChartType: 'doughnut'
};

const CHART_PALETTE = [
  '#0A3D7A', '#F5821F', '#22c55e', '#ef4444', '#3b82f6', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#64748b'
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  
  // State Data Mentah Bangkom
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // State Upload & Notifikasi Umum
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // State Khusus Tab Survei Kepuasan
  const [surveyDashboard, setSurveyDashboard] = useState(null);
  const [surveyRecords, setSurveyRecords] = useState([]);
  const [surveyColumns, setSurveyColumns] = useState([]);
  const [surveyPage, setSurveyPage] = useState(1);
  const [surveyTotalPages, setSurveyTotalPages] = useState(1);
  const [surveyTotalRecords, setSurveyTotalRecords] = useState(0);
  const [surveyFile, setSurveyFile] = useState(null);
  const [surveySearchInput, setSurveySearchInput] = useState('');
  const [surveyActiveSearch, setSurveyActiveSearch] = useState('');

  // State Konfigurasi Kustomisasi Dashboard
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('bangkom_dashboard_config');
      return saved ? { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(saved) } : DEFAULT_WIDGET_CONFIG;
    } catch {
      return DEFAULT_WIDGET_CONFIG;
    }
  });

  const [customWidgets, setCustomWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('bangkom_custom_widgets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customChartsData, setCustomChartsData] = useState({});

  const [newWidget, setNewWidget] = useState({
    title: '',
    groupBy: 'jabatan',
    metric: 'sum_jp',
    chartType: 'bar_horizontal',
    limit: 5,
    color: '#0A3D7A'
  });

  useEffect(() => {
    localStorage.setItem('bangkom_dashboard_config', JSON.stringify(widgetConfig));
  }, [widgetConfig]);

  useEffect(() => {
    localStorage.setItem('bangkom_custom_widgets', JSON.stringify(customWidgets));
  }, [customWidgets]);

  const handleToggleWidget = (key) => {
    setWidgetConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangeChartType = (key, value) => {
    setWidgetConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetConfig = () => {
    setWidgetConfig(DEFAULT_WIDGET_CONFIG);
    setCustomWidgets([]);
    setCustomChartsData({});
  };

  const fetchSingleCustomWidget = async (widget) => {
    try {
      const res = await axios.get('http://localhost:3000/api/custom-chart', {
        params: {
          groupBy: widget.groupBy,
          metric: widget.metric,
          limit: widget.limit
        }
      });
      setCustomChartsData((prev) => ({
        ...prev,
        [widget.id]: res.data
      }));
    } catch (error) {
      console.error("Gagal memuat custom chart:", error);
    }
  };

  const fetchAllCustomWidgets = () => {
    customWidgets.forEach((w) => fetchSingleCustomWidget(w));
  };

  const handleAddCustomWidget = async (e) => {
    e.preventDefault();
    if (!newWidget.title.trim()) return;

    const createdWidget = {
      ...newWidget,
      id: 'custom_' + Date.now()
    };

    setCustomWidgets((prev) => [...prev, createdWidget]);
    await fetchSingleCustomWidget(createdWidget);
    setNewWidget({ ...newWidget, title: '' });
  };

  const handleRemoveCustomWidget = (id) => {
    setCustomWidgets((prev) => prev.filter((w) => w.id !== id));
    setCustomChartsData((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Fetch Data Bangkom
  const fetchDashboard = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard');
      setData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    }
  };

  const fetchRawData = async (pageNumber = 1, searchQuery = '') => {
    try {
      const response = await axios.get(`http://localhost:3000/api/records?page=${pageNumber}&search=${searchQuery}`);
      setRecords(response.data.data);
      setPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
      setTotalRecords(response.data.totalData);
    } catch (error) {
      console.error("Error fetching raw data", error);
    }
  };

  // Fetch Data Survei Kepuasan
  const fetchSurveyDashboard = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/survey/dashboard');
      setSurveyDashboard(response.data);
    } catch (error) {
      console.error("Error fetching survey dashboard", error);
    }
  };

  const fetchSurveyRawData = async (pageNumber = 1, searchQuery = '') => {
    try {
      const response = await axios.get(`http://localhost:3000/api/survey/records?page=${pageNumber}&search=${searchQuery}`);
      setSurveyRecords(response.data.data);
      setSurveyColumns(response.data.columns || []);
      setSurveyPage(response.data.currentPage);
      setSurveyTotalPages(response.data.totalPages);
      setSurveyTotalRecords(response.data.totalData);
    } catch (error) {
      console.error("Error fetching survey records", error);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAllCustomWidgets();
  }, []);

  useEffect(() => {
    if (activeTab === 'rawdata') {
      fetchRawData(page, activeSearch);
    } else if (activeTab === 'survey') {
      fetchSurveyDashboard();
      fetchSurveyRawData(surveyPage, surveyActiveSearch);
    }
  }, [activeTab, page, activeSearch, surveyPage, surveyActiveSearch]);

  // Handler Upload Excel Bangkom
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
      fetchAllCustomWidgets();
      if (activeTab === 'rawdata') fetchRawData(1, activeSearch);
    } catch (error) {
      setMessage('Gagal mengupload file pelatihan.');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  };

  // Handler Upload Excel Survei Kepuasan
  const handleSurveyUpload = async (e) => {
    e.preventDefault();
    if (!surveyFile) return;

    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file_survey', surveyFile);

    try {
      const res = await axios.post('http://localhost:3000/api/survey/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      fetchSurveyDashboard();
      fetchSurveyRawData(1, surveyActiveSearch);
    } catch (error) {
      setMessage('Gagal mengupload file survei kepuasan.');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(1);
  };

  const handleSurveySearch = (e) => {
    e.preventDefault();
    setSurveyActiveSearch(surveySearchInput);
    setSurveyPage(1);
  };

  const handleExport = async () => {
    try {
      setMessage('Menyiapkan file Excel...');
      const response = await axios.get('http://localhost:3000/api/records/all');
      
      const worksheet = XLSX.utils.json_to_sheet(response.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Bangkom");
      
      XLSX.writeFile(workbook, "Export_Data_Bangkom.xlsx");
      setMessage('Berhasil mengunduh Excel.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('Gagal mengekspor data.');
    }
  };

  const handleSurveyExport = async () => {
    try {
      setMessage('Menyiapkan file Excel Survei...');
      const response = await axios.get('http://localhost:3000/api/survey/all');
      
      const worksheet = XLSX.utils.json_to_sheet(response.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Survei_Kepuasan");
      
      XLSX.writeFile(workbook, "Export_Survei_Kepuasan.xlsx");
      setMessage('Berhasil mengunduh Excel Survei.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('Gagal mengekspor data survei.');
    }
  };

  const trendChartData = data ? {
    labels: data.chartBulan,
    datasets: [{
      label: 'Jumlah Peserta',
      data: data.chartPeserta,
      backgroundColor: '#0A3D7A',
      borderColor: '#0A3D7A',
      borderWidth: 2,
      tension: 0.3,
      borderRadius: 4
    }]
  } : null;

  const ratioChartData = data ? {
    labels: ['Memenuhi', 'Belum Memenuhi'],
    datasets: [{
      data: [data.memenuhi, data.belumMemenuhi],
      backgroundColor: ['#F5821F', '#ef4444'],
      borderWidth: 0
    }]
  } : null;

  const renderCustomChart = (widget) => {
    const chartDataRaw = customChartsData[widget.id];
    if (!chartDataRaw || !chartDataRaw.labels) {
      return <p className="text-sm text-gray-400">Memuat data grafik...</p>;
    }

    const isCircular = widget.chartType === 'pie' || widget.chartType === 'doughnut';
    
    const chartDataConfig = {
      labels: chartDataRaw.labels,
      datasets: [{
        label: widget.title,
        data: chartDataRaw.data,
        backgroundColor: isCircular ? CHART_PALETTE : widget.color,
        borderColor: isCircular ? '#ffffff' : widget.color,
        borderWidth: 2,
        tension: 0.3,
        borderRadius: isCircular ? 0 : 4
      }]
    };

    if (widget.chartType === 'bar_horizontal') {
      return <Bar options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }} data={chartDataConfig} />;
    }
    if (widget.chartType === 'bar_vertical') {
      return <Bar options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} data={chartDataConfig} />;
    }
    if (widget.chartType === 'line') {
      return <Line options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} data={chartDataConfig} />;
    }
    if (widget.chartType === 'doughnut') {
      return <div className="w-full max-w-[260px]"><Doughnut data={chartDataConfig} /></div>;
    }
    if (widget.chartType === 'pie') {
      return <div className="w-full max-w-[260px]"><Pie data={chartDataConfig} /></div>;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* NAVBAR FULL STRIP DI ATAS */}
      <header className="w-full h-[72px] bg-[#0A3D7A] border-b-4 border-[#F5821F] flex items-center justify-between px-6 shadow-md z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-inner overflow-hidden p-2">
            <svg className="w-full h-full text-[#0A3D7A]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L1 7l11 5 11-5-11-5zM1 17l11 5 11-5M1 12l11 5 11-5"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-lg md:text-xl font-extrabold text-white leading-tight tracking-wide">EVALUASI PELATIHAN</h1>
            <span className="text-xs md:text-sm text-orange-200 font-medium">Kemnaker RI</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-white leading-none">Administrator</p>
            <p className="text-xs text-gray-300 mt-1">Admin Pusat</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0A3D7A] font-bold shadow-md border-2 border-[#F5821F]">
            AD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0">
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Menu Navigasi</p>
            
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard' ? 'bg-blue-50 text-[#0A3D7A] border border-blue-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                activeTab === 'rawdata' ? 'bg-blue-50 text-[#0A3D7A] border border-blue-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Data Mentah
            </button>

            {/* MENU BARU: SURVEI KEPUASAN */}
            <button 
              onClick={() => setActiveTab('survey')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'survey' ? 'bg-blue-50 text-[#0A3D7A] border border-blue-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Survei Kepuasan
            </button>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* HEADER HALAMAN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <h2 className="text-2xl font-bold text-gray-800">
                {activeTab === 'dashboard' && 'Visualisasi Dashboard'}
                {activeTab === 'rawdata' && 'Data Mentah Pelatihan (Database)'}
                {activeTab === 'survey' && 'Evaluasi & Survei Kepuasan Peserta'}
              </h2>

              {activeTab === 'dashboard' && (
                <button
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors self-start sm:self-auto ${
                    isCustomizing 
                      ? 'bg-[#0A3D7A] text-white border-[#0A3D7A]' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {isCustomizing ? 'Tutup Pengaturan' : 'Kustomisasi & Buat Grafik'}
                </button>
              )}
            </div>

            {/* NOTIFIKASI GLOBAL */}
            {message && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg shadow-sm">
                {message}
              </div>
            )}

            {/* PANEL PENGATURAN DASHBOARD */}
            {activeTab === 'dashboard' && isCustomizing && (
              <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-[#0A3D7A] space-y-6">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#0A3D7A]">Buat Widget Grafik Baru (Custom Data)</h3>
                      <p className="text-xs text-gray-500">Pilih kombinasi kolom dan metrik dari database untuk membuat visualisasi baru.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddCustomWidget} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Judul Grafik</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Misal: Distribusi JP per Jabatan"
                        value={newWidget.title}
                        onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0A3D7A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kelompokkan (X)</label>
                      <select 
                        value={newWidget.groupBy}
                        onChange={(e) => setNewWidget({ ...newWidget, groupBy: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="jabatan">Jabatan</option>
                        <option value="instansi">Instansi Penyelenggara</option>
                        <option value="unit_kerja">Unit Kerja</option>
                        <option value="nama_diklat">Nama Diklat</option>
                        <option value="bulan">Bulan Pelaksanaan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Metrik Hitung (Y)</label>
                      <select 
                        value={newWidget.metric}
                        onChange={(e) => setNewWidget({ ...newWidget, metric: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="sum_jp">Total Jam Pelajaran (JP)</option>
                        <option value="avg_jp">Rata-Rata JP</option>
                        <option value="count_records">Frekuensi Kegiatan</option>
                        <option value="count_employees">Jumlah Pegawai Unik</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Bentuk & Batas</label>
                      <div className="flex gap-2">
                        <select 
                          value={newWidget.chartType}
                          onChange={(e) => setNewWidget({ ...newWidget, chartType: e.target.value })}
                          className="w-2/3 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                        >
                          <option value="bar_horizontal">Bar Horizontal</option>
                          <option value="bar_vertical">Bar Vertikal</option>
                          <option value="line">Line (Garis)</option>
                          <option value="doughnut">Doughnut</option>
                          <option value="pie">Pie</option>
                        </select>
                        <select 
                          value={newWidget.limit}
                          onChange={(e) => setNewWidget({ ...newWidget, limit: Number(e.target.value) })}
                          className="w-1/3 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                        >
                          <option value={5}>Top 5</option>
                          <option value={10}>Top 10</option>
                          <option value={15}>Top 15</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Warna</label>
                        <input 
                          type="color" 
                          value={newWidget.color}
                          onChange={(e) => setNewWidget({ ...newWidget, color: e.target.value })}
                          className="h-9 w-12 border border-gray-300 rounded-lg cursor-pointer bg-white p-1"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="flex-1 bg-[#F5821F] hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors mt-4"
                      >
                        + Tambah
                      </button>
                    </div>
                  </form>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 gap-2">
                  <h3 className="text-sm font-bold text-gray-700 uppercase">Visibilitas Komponen Bawaan</h3>
                  <button
                    onClick={handleResetConfig}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Reset Semua & Hapus Grafik Kustom
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showUploadPanel} onChange={() => handleToggleWidget('showUploadPanel')} className="rounded text-[#0A3D7A]" />
                    <span>Panel Upload Excel</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showSummaryCards} onChange={() => handleToggleWidget('showSummaryCards')} className="rounded text-[#0A3D7A]" />
                    <span>Kartu Indikator (KPI)</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showTrendChart} onChange={() => handleToggleWidget('showTrendChart')} className="rounded text-[#0A3D7A]" />
                    <span>Grafik Tren Bulanan</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showRatioChart} onChange={() => handleToggleWidget('showRatioChart')} className="rounded text-[#0A3D7A]" />
                    <span>Grafik Rasio 20 JP</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showTopUnitChart} onChange={() => handleToggleWidget('showTopUnitChart')} className="rounded text-[#0A3D7A]" />
                    <span>Top 5 Unit Kerja</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showTopDiklatChart} onChange={() => handleToggleWidget('showTopDiklatChart')} className="rounded text-[#0A3D7A]" />
                    <span>Top 5 Diklat Terpopuler</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={widgetConfig.showTopPegawaiTable} onChange={() => handleToggleWidget('showTopPegawaiTable')} className="rounded text-[#0A3D7A]" />
                    <span>Tabel Top 10 Pegawai</span>
                  </label>
                </div>
              </div>
            )}

            {/* PANEL UPLOAD BANGKOM (Hanya di Tab Dashboard & Rawdata) */}
            {activeTab !== 'survey' && (widgetConfig.showUploadPanel || activeTab === 'rawdata') && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Perbarui Data Bangkom</h3>
                  <p className="text-gray-500 text-sm">Unggah file Excel (.xlsx) riwayat pelatihan untuk memperbarui database</p>
                </div>
                <form onSubmit={handleUpload} className="flex w-full md:w-auto gap-2">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={(e) => setFile(e.target.files[0])} 
                    className="flex-1 md:flex-none border border-gray-300 p-2 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A3D7A]"
                    required 
                  />
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-[#0A3D7A] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center transition-colors"
                  >
                    {loading ? 'Memproses...' : 'Upload'}
                  </button>
                </form>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 1: DASHBOARD BANGKOM */}
            {/* ===================================================================== */}
            {activeTab === 'dashboard' && data && (
              <div className="space-y-6">
                
                {widgetConfig.showSummaryCards && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#0A3D7A]">
                      <p className="text-gray-500 text-sm font-medium">Total Pegawai</p>
                      <h2 className="text-3xl font-bold text-gray-800 mt-2">{data.totalPegawai.toLocaleString()}</h2>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#F5821F]">
                      <p className="text-gray-500 text-sm font-medium">Memenuhi 20 JP</p>
                      <div className="flex items-end justify-between mt-2">
                        <h2 className="text-3xl font-bold text-[#F5821F]">{data.memenuhi.toLocaleString()}</h2>
                        <p className="text-sm text-[#F5821F] font-medium bg-orange-50 px-2 py-1 rounded">
                          {data.totalPegawai ? ((data.memenuhi/data.totalPegawai)*100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
                      <p className="text-gray-500 text-sm font-medium">Belum Memenuhi</p>
                      <h2 className="text-3xl font-bold text-red-600 mt-2">{data.belumMemenuhi.toLocaleString()}</h2>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-gray-400">
                      <p className="text-gray-500 text-sm font-medium">Rata-Rata JP</p>
                      <h2 className="text-3xl font-bold text-gray-800 mt-2">
                        {data.rataRataJP} <span className="text-lg text-gray-400 font-normal">JP/Orang</span>
                      </h2>
                    </div>
                  </div>
                )}

                {customWidgets.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {customWidgets.map((widget) => (
                      <div key={widget.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <div className="flex justify-between items-start border-b pb-3 mb-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0A3D7A] px-2 py-0.5 rounded border border-blue-100">
                              Grafik Kustom • Top {widget.limit}
                            </span>
                            <h3 className="text-lg font-bold text-gray-800 mt-1">{widget.title}</h3>
                          </div>
                          <button 
                            onClick={() => handleRemoveCustomWidget(widget.id)}
                            className="text-gray-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                        <div className="h-72 flex items-center justify-center">
                          {renderCustomChart(widget)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(widgetConfig.showTrendChart || widgetConfig.showRatioChart) && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {widgetConfig.showTrendChart && (
                      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${widgetConfig.showRatioChart ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                        <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Tren Peserta Pelatihan Bulanan</h3>
                        <div className="h-72 flex items-center justify-center">
                          {widgetConfig.trendChartType === 'bar' ? (
                            <Bar options={{ maintainAspectRatio: false }} data={trendChartData} />
                          ) : (
                            <Line options={{ maintainAspectRatio: false }} data={trendChartData} />
                          )}
                        </div>
                      </div>
                    )}

                    {widgetConfig.showRatioChart && (
                      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col ${widgetConfig.showTrendChart ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                        <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Rasio Pemenuhan JP</h3>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-full max-w-[240px]">
                            {widgetConfig.ratioChartType === 'doughnut' ? (
                              <Doughnut data={ratioChartData} />
                            ) : (
                              <Pie data={ratioChartData} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(widgetConfig.showTopUnitChart || widgetConfig.showTopDiklatChart) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {widgetConfig.showTopUnitChart && (
                      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${!widgetConfig.showTopDiklatChart ? 'lg:col-span-2' : ''}`}>
                        <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Top 5 Unit Kerja (Total JP)</h3>
                        <div className="h-72 flex items-center justify-center">
                          <Bar 
                            options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                            data={{
                              labels: data.topUnitKerjaLabels,
                              datasets: [{ data: data.topUnitKerjaData, backgroundColor: '#22c55e', borderRadius: 4 }]
                            }} 
                          />
                        </div>
                      </div>
                    )}

                    {widgetConfig.showTopDiklatChart && (
                      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${!widgetConfig.showTopUnitChart ? 'lg:col-span-2' : ''}`}>
                        <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Top 5 Diklat Terpopuler</h3>
                        <div className="h-72 flex items-center justify-center">
                          <Bar 
                            options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                            data={{
                              labels: data.topDiklatLabels,
                              datasets: [{ data: data.topDiklatData, backgroundColor: '#3b82f6', borderRadius: 4 }]
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {widgetConfig.showTopPegawaiTable && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Top 10 Pegawai Paling Aktif (JP Tertinggi)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-600 min-w-max">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-center w-16">Rank</th>
                            <th className="px-4 py-3">Nama Pegawai & NIP</th>
                            <th className="px-4 py-3">Unit Kerja</th>
                            <th className="px-4 py-3 text-center">Total Kegiatan</th>
                            <th className="px-4 py-3 text-center">Total JP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.topPegawai && data.topPegawai.map((pegawai, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-black text-center text-[#0A3D7A] text-lg">#{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-gray-800">{pegawai.nama}</div>
                                <div className="text-xs text-gray-500">{pegawai.nip}</div>
                              </td>
                              <td className="px-4 py-3 text-xs">{pegawai.unit_kerja}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-md text-xs font-semibold">
                                  {pegawai.total_kegiatan} Kali
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-[#F5821F] text-white px-3 py-1 rounded-full font-bold text-xs shadow-sm">
                                  {pegawai.total_jp} JP
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 2: DATA MENTAH BANGKOM */}
            {/* ===================================================================== */}
            {activeTab === 'rawdata' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-800">Tabel Database Riwayat Pelatihan</h3>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
                      <input 
                        type="text" 
                        placeholder="Cari NIP, Nama, Unit, Jabatan..." 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="border border-gray-300 p-2 rounded-l-lg text-sm w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-[#0A3D7A]"
                      />
                      <button type="submit" className="bg-gray-100 border border-gray-300 border-l-0 text-gray-700 px-3 py-2 rounded-r-lg text-sm font-medium hover:bg-gray-200">
                        Cari
                      </button>
                    </form>

                    <button 
                      onClick={handleExport}
                      className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center transition-colors"
                    >
                      Export Excel
                    </button>

                    <span className="w-full sm:w-auto text-center text-sm bg-blue-50 text-[#0A3D7A] py-2 px-4 rounded-lg font-medium border border-blue-100">
                      Total: {totalRecords.toLocaleString()} Data
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600 min-w-max">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-4 font-semibold">NIP</th>
                        <th className="px-4 py-4 font-semibold">Nama Pegawai</th>
                        <th className="px-4 py-4 font-semibold">Jabatan</th>
                        <th className="px-4 py-4 font-semibold">Unit Kerja</th>
                        <th className="px-4 py-4 font-semibold">Nama Diklat</th>
                        <th className="px-4 py-4 font-semibold">Penyelenggara</th>
                        <th className="px-4 py-4 font-semibold">Tgl Mulai</th>
                        <th className="px-4 py-4 font-semibold">Tgl Selesai</th>
                        <th className="px-4 py-4 font-semibold text-center">JP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.length > 0 ? records.map((rec) => (
                        <tr key={rec.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{rec.nip}</td>
                          <td className="px-4 py-3">{rec.nama}</td>
                          <td className="px-4 py-3 text-xs">{rec.jabatan}</td>
                          <td className="px-4 py-3 text-xs">{rec.unit_kerja}</td>
                          <td className="px-4 py-3">
                            <div className="truncate max-w-[200px]" title={rec.nama_diklat}>
                              {rec.nama_diklat}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{rec.instansi}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{rec.mulai_diklat}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{rec.akhir_diklat}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-bold text-xs">
                              {rec.jam_pelajaran}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="9" className="text-center py-10 text-gray-500">
                            {activeSearch ? 'Data tidak ditemukan.' : 'Belum ada data di database. Silakan unggah file Excel.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-gray-600">
                    Halaman <span className="font-bold text-gray-900">{page}</span> dari <span className="font-bold text-gray-900">{totalPages}</span>
                  </span>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: SURVEI KEPUASAN PESERTA (FITUR BARU) */}
            {/* ===================================================================== */}
            {activeTab === 'survey' && (
              <div className="space-y-6">
                
                {/* Panel Upload Khusus File Survei Kepuasan */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Unggah Data Survei Kepuasan</h3>
                    <p className="text-gray-500 text-sm">Mendukung file Excel (.xlsx / .csv) kuesioner multi-kolom secara otomatis</p>
                  </div>
                  <form onSubmit={handleSurveyUpload} className="flex w-full md:w-auto gap-2">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={(e) => setSurveyFile(e.target.files[0])} 
                      className="flex-1 md:flex-none border border-gray-300 p-2 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A3D7A]"
                      required 
                    />
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="bg-[#F5821F] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center transition-colors"
                    >
                      {loading ? 'Memproses...' : 'Upload Survei'}
                    </button>
                  </form>
                </div>

                {/* Ringkasan KPI & Grafik Survei Kepuasan */}
                {surveyDashboard && surveyDashboard.totalResponden > 0 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#0A3D7A]">
                        <p className="text-gray-500 text-sm font-medium">Total Responden</p>
                        <h2 className="text-3xl font-bold text-gray-800 mt-2">{surveyDashboard.totalResponden.toLocaleString()}</h2>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-[#F5821F]">
                        <p className="text-gray-500 text-sm font-medium">Rata-Rata Skor Kepuasan</p>
                        <h2 className="text-3xl font-bold text-[#F5821F] mt-2">
                          {surveyDashboard.overallAverage} <span className="text-sm text-gray-400 font-normal">/ 5.00</span>
                        </h2>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                        <p className="text-gray-500 text-sm font-medium">Indeks Kepuasan</p>
                        <h2 className="text-3xl font-bold text-green-600 mt-2">{surveyDashboard.overallIndexPercent}%</h2>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-gray-400">
                        <p className="text-gray-500 text-sm font-medium">Total Kolom Kuesioner</p>
                        <h2 className="text-3xl font-bold text-gray-800 mt-2">{surveyDashboard.columns.length}</h2>
                      </div>
                    </div>

                    {surveyDashboard.questionStats.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                          <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Rata-Rata Skor per Indikator Pertanyaan (Skala 1 - 5)</h3>
                          <div className="h-80 flex items-center justify-center">
                            <Bar 
                              options={{ 
                                indexAxis: 'y',
                                maintainAspectRatio: false,
                                scales: { x: { min: 0, max: 5 } },
                                plugins: { legend: { display: false } }
                              }}
                              data={{
                                labels: surveyDashboard.questionStats.slice(0, 12).map(q => q.question.length > 45 ? q.question.substring(0, 45) + '...' : q.question),
                                datasets: [{
                                  label: 'Skor Rata-Rata',
                                  data: surveyDashboard.questionStats.slice(0, 12).map(q => q.avgScore),
                                  backgroundColor: '#0A3D7A',
                                  borderRadius: 4
                                }]
                              }} 
                            />
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                          <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Distribusi Tingkat Kepuasan</h3>
                          <div className="flex-1 flex items-center justify-center">
                            <div className="w-full max-w-[240px]">
                              <Doughnut 
                                data={{
                                  labels: Object.keys(surveyDashboard.distribution),
                                  datasets: [{
                                    data: Object.values(surveyDashboard.distribution),
                                    backgroundColor: ['#22c55e', '#3b82f6', '#F5821F', '#f97316', '#ef4444'],
                                    borderWidth: 0
                                  }]
                                }} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Tabel Dinamis Seluruh Kolom Survei Kepuasan */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Tabel Detail Respons Survei Kepuasan</h3>
                      <p className="text-xs text-gray-500">Geser tabel ke samping untuk melihat seluruh kolom pertanyaan survei</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                      <form onSubmit={handleSurveySearch} className="flex w-full sm:w-auto">
                        <input 
                          type="text" 
                          placeholder="Cari isi respons survei..." 
                          value={surveySearchInput}
                          onChange={(e) => setSurveySearchInput(e.target.value)}
                          className="border border-gray-300 p-2 rounded-l-lg text-sm w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-[#0A3D7A]"
                        />
                        <button type="submit" className="bg-gray-100 border border-gray-300 border-l-0 text-gray-700 px-3 py-2 rounded-r-lg text-sm font-medium hover:bg-gray-200">
                          Cari
                        </button>
                      </form>

                      <button 
                        onClick={handleSurveyExport}
                        className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center transition-colors"
                      >
                        Export Excel
                      </button>

                      <span className="w-full sm:w-auto text-center text-sm bg-blue-50 text-[#0A3D7A] py-2 px-4 rounded-lg font-medium border border-blue-100">
                        Total: {surveyTotalRecords.toLocaleString()} Responden
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-xs text-left text-gray-600 min-w-max border-collapse">
                      <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold border-r border-gray-200 w-12 text-center">No</th>
                          {surveyColumns.map((col, idx) => (
                            <th key={idx} className="px-4 py-3 font-bold border-r border-gray-200 max-w-[260px] truncate" title={col}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {surveyRecords.length > 0 ? surveyRecords.map((row, rIdx) => (
                          <tr key={row.id || rIdx} className="bg-white hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-900 border-r border-gray-100 text-center">
                              {(surveyPage - 1) * 50 + rIdx + 1}
                            </td>
                            {surveyColumns.map((col, cIdx) => (
                              <td key={cIdx} className="px-4 py-3 border-r border-gray-100 max-w-[260px] truncate" title={row[col]}>
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={surveyColumns.length + 1 || 5} className="text-center py-12 text-gray-500 text-sm">
                              {surveyActiveSearch ? 'Data survei tidak ditemukan.' : 'Belum ada data survei kepuasan. Silakan unggah file Excel survei Anda di atas.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                    <button 
                      disabled={surveyPage === 1}
                      onClick={() => setSurveyPage(surveyPage - 1)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-sm text-gray-600">
                      Halaman <span className="font-bold text-gray-900">{surveyPage}</span> dari <span className="font-bold text-gray-900">{surveyTotalPages}</span>
                    </span>
                    <button 
                      disabled={surveyPage === surveyTotalPages}
                      onClick={() => setSurveyPage(surveyPage + 1)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
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
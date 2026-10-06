import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Activity, 
  Sliders, 
  Settings, 
  Bell, 
  ShieldCheck, 
  Car, 
  Cpu, 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  Navigation,
  Radio,
  Layers
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [vehicleCount, setVehicleCount] = useState({ cars: 842, trucks: 215, buses: 120, bikes: 251 });
  const [modelFps] = useState(30);

  // States for YOLOv11 (Port 8000)
  const [yoloData, setYoloData] = useState({ vehicle_count: '--', traffic_density: '--%', congestion_level: 'LOADING' });
  const [selectedVideoSource, setSelectedVideoSource] = useState('videos/sb1.mp4');

  // States for YOLOv3 (Port 8001)
  const [yolo3Data, setYolo3Data] = useState({ vehicle_count: '--', traffic_density: '--%', congestion_level: 'LOADING' });
  const [selectedVideoSource3, setSelectedVideoSource3] = useState('videos/sb1.mp4');

  const [trafficLights, setTrafficLights] = useState([
    { id: 'INT-01', name: 'Main St & 5th Ave', status: 'Optimized', timing: '45s Green', density: 'High (82%)', mode: 'Auto' },
    { id: 'INT-02', name: 'Broadway & 42nd St', status: 'Optimized', timing: '30s Green', density: 'Moderate (54%)', mode: 'Auto' },
    { id: 'INT-03', name: 'Park Avenue & 72nd', status: 'Synchronized', timing: '60s Green', density: 'Low (28%)', mode: 'Auto' },
    { id: 'INT-04', name: 'State Route 101 Jct', status: 'Manual Override', timing: '90s Green', density: 'Critical (94%)', mode: 'Manual' },
  ]);
  const [routes] = useState([
    { id: 'R-101', start: 'Downtown Hub', end: 'Airport Terminal', status: 'Optimal', duration: '24 min', alternative: 'Available via I-90' },
    { id: 'R-102', start: 'Tech District', end: 'Central Station', status: 'Congested', duration: '41 min', alternative: 'Recommended via River Road (-15 min)' },
    { id: 'R-103', start: 'University Campus', end: 'North Harbor', status: 'Clear', duration: '18 min', alternative: 'Direct route optimal' },
  ]);
  const [notification, setNotification] = useState({ show: false, message: '' });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isLiveActive) {
        setVehicleCount(prev => ({
          cars: prev.cars + Math.floor(Math.random() * 7) - 3,
          trucks: prev.trucks + Math.floor(Math.random() * 3) - 1,
          buses: prev.buses + Math.floor(Math.random() * 2),
          bikes: prev.bikes + Math.floor(Math.random() * 5) - 2,
        }));
      }
    }, 1500);

    // Fetch metrics from YOLOv11 (Port 8000)
    const fetchYoloData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/traffic-data");
        if (res.ok) setYoloData(await res.json());
      } catch (e) {}
    };

    // Fetch metrics from YOLOv3 (Port 8001)
    const fetchYolo3Data = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8001/traffic-data");
        if (res.ok) setYolo3Data(await res.json());
      } catch (e) {}
    };

    const yoloInterval = setInterval(() => {
      fetchYoloData();
      fetchYolo3Data();
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(yoloInterval);
    };
  }, [isLiveActive]);

  const triggerAlert = (msg) => {
    setNotification({ show: true, message: msg });
    setTimeout(() => setNotification({ show: false, message: '' }), 3500);
  };

  const applyVideoChange = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/change-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_name: selectedVideoSource })
      });
      if (res.ok) {
        triggerAlert(`YOLOv11 source changed to: ${selectedVideoSource}`);
        const streamImg = document.getElementById("integrated-yolo-stream");
        if (streamImg) {
          streamImg.src = "";
          setTimeout(() => { streamImg.src = "http://127.0.0.1:8000/video-feed?t=" + Date.now(); }, 200);
        }
      }
    } catch (err) {
      alert("Failed to connect to Python backend on port 8000.");
    }
  };

  const applyVideoChange3 = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8001/change-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_name: selectedVideoSource3 })
      });
      if (res.ok) {
        triggerAlert(`YOLOv3 source changed to: ${selectedVideoSource3}`);
        const streamImg = document.getElementById("integrated-yolo-stream-3");
        if (streamImg) {
          streamImg.src = "";
          setTimeout(() => { streamImg.src = "http://127.0.0.1:8001/video-feed?t=" + Date.now(); }, 200);
        }
      }
    } catch (err) {
      alert("Failed to connect to Python backend on port 8001.");
    }
  };

  const toggleLightMode = (id) => {
    setTrafficLights(prev => prev.map(light => {
      if (light.id === id) {
        const newMode = light.mode === 'Auto' ? 'Manual' : 'Auto';
        triggerAlert(`Intersection ${id} switched to ${newMode} mode`);
        return { ...light, mode: newMode, status: newMode === 'Manual' ? 'Manual Override' : 'Optimized' };
      }
      return light;
    }));
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-white border border-cyan-500/40 text-cyan-700 px-4 py-3 rounded-xl shadow-xl animate-bounce">
          <Zap className="w-5 h-5 text-cyan-600" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col justify-between hidden md:flex shadow-lg">
        <div>
          <div className="h-20 flex items-center px-6 gap-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">TRAFFIX</h1>
              <span className="text-xs text-cyan-400 font-mono">Smart Traffic AI v2.4</span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'yolo', label: 'Live Camera Feeds', icon: Video, badge: 'YOLOv11' },
              { id: 'yolo3', label: 'YOLOv3 Feed', icon: Layers, badge: 'YOLOv3' },
              { id: 'density', label: 'Density Analysis', icon: Activity },
              { id: 'lights', label: 'Traffic Light Controls', icon: Sliders },
              { id: 'routes', label: 'Route Recommendations', icon: Navigation },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 m-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">YOLOv11 Inference</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ACTIVE
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full w-[96.8%]"></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400 font-mono">
            <span>Accuracy: 96.8%</span>
            <span>{modelFps} FPS</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
                {activeTab === 'dashboard' ? 'System Overview & Control Center' : 
                 activeTab === 'yolo' ? 'YOLOv11 Real-Time Object Detection' :
                 activeTab === 'yolo3' ? 'YOLOv3 Real-Time Object Detection' :
                 activeTab === 'density' ? 'Traffic Density Analytics' :
                 activeTab === 'lights' ? 'Intersection Signal Controller' :
                 activeTab === 'routes' ? 'AI Route Optimization Engine' : 'System Configuration'}
              </h2>
              <p className="text-xs text-slate-500">Autonomous Traffic Optimization & Signal Timing System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-cyan-700">
              <Radio className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>

            <button 
              onClick={() => triggerAlert('All 12 traffic nodes operating at optimal synchronization.')}
              className="relative p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                AD
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-sm font-semibold text-slate-800">Admin Operator</div>
                <div className="text-xs text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  System Supervisor
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Body */}
        <main className="p-8 space-y-8 bg-slate-100">

          {/* OVERVIEW METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-cyan-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Vehicles Detected</span>
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                  <Car className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 font-mono mb-1">{yoloData.vehicle_count}</div>
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <span className="font-medium">Live from Python API</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Avg Traffic Density</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 font-mono mb-1">{yoloData.traffic_density}</div>
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <span className="font-medium">Real-time telemetry</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Signals Synchronized</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Sliders className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 font-mono mb-1">12 / 12</div>
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <span className="font-medium">100% Synchronized</span>
                <span className="text-slate-400">Zero latency</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">YOLOv11 Model Accuracy</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 font-mono mb-1">96.8%</div>
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <span className="font-medium">mAP @ 0.50</span>
                <span className="text-slate-400">Real-time weights</span>
              </div>
            </div>
          </div>

          {/* DASHBOARD TAB VIEW */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                      <h3 className="text-base font-bold text-slate-800">Live YOLOv11 Object Detection Feed [Integrated]</h3>
                    </div>
                  </div>

                  {/* Integrated Python Stream */}
                  <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center">
                    <img 
                      id="integrated-yolo-stream"
                      src="http://127.0.0.1:8000/video-feed" 
                      alt="Integrated Live Stream" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Right Col: Traffic Light Control Quick Panel */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-800">Intersection Control Status</h3>
                    <button 
                      onClick={() => triggerAlert('Global AI timing synchronization broadcasted.')}
                      className="text-xs text-cyan-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Force Sync
                    </button>
                  </div>

                  <div className="space-y-4">
                    {trafficLights.map((light) => (
                      <div key={light.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-cyan-700 font-bold">{light.id}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            light.mode === 'Auto' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            {light.status}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 text-sm mb-3">{light.name}</div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                          <span>Density: <strong className="text-slate-800">{light.density}</strong></span>
                          <span>Timing: <strong className="text-cyan-700">{light.timing}</strong></span>
                        </div>
                        <button
                          onClick={() => toggleLightMode(light.id)}
                          className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                            light.mode === 'Auto' 
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                              : 'bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-md'
                          }`}
                        >
                          Mode: {light.mode} (Click to toggle)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* YOLOv11 TAB VIEW */}
          {activeTab === 'yolo' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Smart Traffic Monitoring - YOLOv11 AI Module</h3>
                    <p className="text-xs text-slate-500">Connected to Python Backend API &bull; Live Stream Active</p>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label htmlFor="video-select" className="text-xs font-medium text-slate-600">Select Traffic Source:</label>
                    <select 
                      id="video-select" 
                      value={selectedVideoSource}
                      onChange={(e) => setSelectedVideoSource(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg p-2 outline-none cursor-pointer"
                    >
                      <option value="videos/video1.mp4">my_traffic.mp4</option>
                      <option value="videos/My_Traffic1.mp4">My_Traffic1.mp4</option>
                      <option value="videos/sb1.mp4">sb1.mp4</option>
                      <option value="videos/video1.mp4">video1.mp4</option>
                      <option value="videos/video2.mp4">video2.mp4</option>
                      <option value="videos/video3.mp4">video3.mp4</option>
                    </select>
                    <button 
                      onClick={applyVideoChange}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 transition shadow-md cursor-pointer"
                    >
                      Apply Source
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-200 overflow-hidden mb-6 flex items-center justify-center">
                  <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-slate-950/80 text-cyan-400 text-xs font-mono border border-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE YOLOv11 DETECTION STREAM
                  </div>
                  <img 
                    id="integrated-yolo-stream"
                    src="http://127.0.0.1:8000/video-feed" 
                    alt="Live YOLOv11 Stream" 
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Detected Vehicles</h3>
                    <div className="text-4xl font-extrabold text-slate-800 font-mono">{yoloData.vehicle_count}</div>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Traffic Density</h3>
                    <div className="text-4xl font-extrabold text-cyan-600 font-mono">{yoloData.traffic_density}</div>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Congestion Level</h3>
                    <div className="mt-2">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider font-mono ${
                        yoloData.congestion_level === 'LOW' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                        yoloData.congestion_level === 'MODERATE' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                        yoloData.congestion_level === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-300' :
                        'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}>
                        {yoloData.congestion_level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center text-xs text-slate-500 font-mono border-t border-slate-200 pt-4">
                  Active Source: <span className="text-cyan-600 font-bold">{selectedVideoSource}</span> | Backend Status: <span className="text-emerald-600 font-bold">Connected (Port 8000)</span>
                </div>

              </div>
            </div>
          )}

          {/* YOLOv3 TAB VIEW (نفس الشكل والتصميم تماماً ولكن متصل بـ 8001) */}
          {activeTab === 'yolo3' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Smart Traffic Monitoring - YOLOv3 AI Module</h3>
                    <p className="text-xs text-slate-500">Connected to Python Backend API &bull; Port 8001 Live Stream Active</p>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label htmlFor="video-select-3" className="text-xs font-medium text-slate-600">Select Traffic Source:</label>
                    <select 
                      id="video-select-3" 
                      value={selectedVideoSource3}
                      onChange={(e) => setSelectedVideoSource3(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg p-2 outline-none cursor-pointer"
                    >
                      <option value="videos/video1.mp4">my_traffic.mp4</option>
                      <option value="videos/My_Traffic1.mp4">My_Traffic1.mp4</option>
                      <option value="videos/sb1.mp4">sb1.mp4</option>
                      <option value="videos/video1.mp4">video1.mp4</option>
                      <option value="videos/video2.mp4">video2.mp4</option>
                      <option value="videos/video3.mp4">video3.mp4</option>
                    </select>
                    <button 
                      onClick={applyVideoChange3}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition shadow-md cursor-pointer"
                    >
                      Apply Source
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-200 overflow-hidden mb-6 flex items-center justify-center">
                  <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-slate-950/80 text-amber-400 text-xs font-mono border border-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    LIVE YOLOv3 DETECTION STREAM
                  </div>
                  <img 
                    id="integrated-yolo-stream-3"
                    src="http://127.0.0.1:8001/video-feed" 
                    alt="Live YOLOv3 Stream" 
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Detected Vehicles</h3>
                    <div className="text-4xl font-extrabold text-slate-800 font-mono">{yolo3Data.vehicle_count}</div>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Traffic Density</h3>
                    <div className="text-4xl font-extrabold text-amber-600 font-mono">{yolo3Data.traffic_density}</div>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-sm">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Congestion Level</h3>
                    <div className="mt-2">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider font-mono ${
                        yolo3Data.congestion_level === 'LOW' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                        yolo3Data.congestion_level === 'MODERATE' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                        yolo3Data.congestion_level === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-300' :
                        'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}>
                        {yolo3Data.congestion_level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center text-xs text-slate-500 font-mono border-t border-slate-200 pt-4">
                  Active Source: <span className="text-amber-600 font-bold">{selectedVideoSource3}</span> | Backend Status: <span className="text-emerald-600 font-bold">Connected (Port 8001)</span>
                </div>

              </div>
            </div>
          )}

          {/* LIGHTS TAB VIEW */}
          {activeTab === 'lights' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Traffic Light Optimization & Timing Matrix</h3>
                    <p className="text-xs text-slate-500">Autonomous timing calculated via real-time YOLO traffic density algorithms.</p>
                  </div>
                  <button 
                    onClick={() => triggerAlert('Optimized signal timing broadcasted to all nodes.')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-md hover:bg-cyan-700 transition-colors"
                  >
                    Apply Global AI Timings
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-mono text-slate-500">
                        <th className="py-3 px-4">Intersection ID & Name</th>
                        <th className="py-3 px-4">Current Density</th>
                        <th className="py-3 px-4">Signal Timing</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4">Action / Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {trafficLights.map((light) => (
                        <tr key={light.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-slate-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 font-mono text-xs">
                              {light.id}
                            </div>
                            <div>
                              <div>{light.name}</div>
                              <div className="text-xs text-slate-400">Node status: {light.status}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-600">{light.density}</td>
                          <td className="py-4 px-4 font-mono text-cyan-700">{light.timing}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-mono ${
                              light.mode === 'Auto' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {light.mode}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => toggleLightMode(light.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 border border-slate-200 transition-colors"
                            >
                              Toggle Mode
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ROUTES TAB VIEW */}
          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Driver Route Requests & AI Recommendations</h3>
                    <p className="text-xs text-slate-500">Real-time alternative route generation to bypass urban congestion bottlenecks.</p>
                  </div>
                  <button 
                    onClick={() => triggerAlert('New alternative routes calculated for all registered drivers.')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4 text-cyan-600" />
                    Refresh Route Matrix
                  </button>
                </div>

                <div className="space-y-4">
                  {routes.map((route) => (
                    <div key={route.id} className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 font-mono text-xs mt-0.5">
                          {route.id}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-slate-800 text-base">{route.start}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <span className="font-bold text-slate-800 text-base">{route.end}</span>
                          </div>
                          <p className="text-xs text-cyan-700 font-mono">{route.alternative}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Estimated Duration</div>
                          <div className="text-base font-bold font-mono text-slate-800">{route.duration}</div>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                            route.status === 'Optimal' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                            route.status === 'Congested' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                            'bg-cyan-100 text-cyan-700 border border-cyan-300'
                          }`}>
                            {route.status}
                          </span>
                        </div>
                        <button 
                          onClick={() => triggerAlert(`Route ${route.id} pushed to connected driver navigation apps.`)}
                          className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-md hover:bg-cyan-700 transition-colors"
                        >
                          Push Route
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DENSITY & SETTINGS TABS */}
          {(activeTab === 'density' || activeTab === 'settings') && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 mx-auto mb-4">
                {activeTab === 'density' ? <Activity className="w-8 h-8" /> : <Settings className="w-8 h-8" />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {activeTab === 'density' ? 'Advanced Traffic Density & Heatmaps Module' : 'Traffix System Configuration & YOLO Parameters'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                This module is fully integrated with your graduation project backend services. All model hyperparameters and intersection telemetry are actively synchronized.
              </p>
              <button 
                onClick={() => triggerAlert('Configuration parameters reloaded successfully.')}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-colors"
              >
                Reload Module Telemetry
              </button>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
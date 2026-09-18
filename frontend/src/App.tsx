import React, { useEffect, useState } from 'react';
import {
  HeartHandshake,
  Activity,
  Wifi,
  WifiOff,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  Check,
  AlertTriangle
} from 'lucide-react';
import { socket } from './services/socket';
import { apiClient } from './services/api';

type UserRole = 'DONOR' | 'NGO' | 'VOLUNTEER' | 'ADMIN';
type DonationStatus = 'AVAILABLE' | 'CLAIMED' | 'EN_ROUTE' | 'COLLECTED' | 'DELIVERED' | 'EXPIRED';

interface HealthData {
  status: string;
  uptime: number;
  environment: string;
  database: string;
  activeSockets: number;
}

export function App() {
  const [socketConnected, setSocketConnected] = useState<boolean>(socket.connected);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);
  const [activeFsmStep, setActiveFsmStep] = useState<DonationStatus>('AVAILABLE');
  const [lastPing, setLastPing] = useState<string>('');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await apiClient.get('/health');
      if (res.data && res.data.data) {
        setHealthData(res.data.data);
      }
      setLastPing(new Date().toLocaleTimeString());
    } catch {
      setHealthData(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const fsmSteps: { status: DonationStatus; title: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      status: 'AVAILABLE',
      title: '1. Available',
      desc: 'Donor posts surplus food with expiry time and location',
      icon: <Package className="w-5 h-5" />,
      color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    },
    {
      status: 'CLAIMED',
      title: '2. Claimed',
      desc: 'Registered NGO accepts and reserves the food donation',
      icon: <Check className="w-5 h-5" />,
      color: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    },
    {
      status: 'EN_ROUTE',
      title: '3. En Route',
      desc: 'Volunteer or NGO driver dispatched for pickup with live GPS tracking',
      icon: <Truck className="w-5 h-5" />,
      color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    },
    {
      status: 'COLLECTED',
      title: '4. Collected',
      desc: 'Food verified and picked up from donor premises',
      icon: <Layers className="w-5 h-5" />,
      color: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
    },
    {
      status: 'DELIVERED',
      title: '5. Delivered',
      desc: 'Successfully received by community kitchen or shelter',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'border-green-500/50 bg-green-500/10 text-green-400',
    },
    {
      status: 'EXPIRED',
      title: 'Terminal: Expired',
      desc: 'Food exceeded shelf life before claim or pickup',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
    },
  ];

  const roles: { role: UserRole; title: string; desc: string; icon: React.ReactNode; badgeColor: string }[] = [
    {
      role: 'DONOR',
      title: 'Food Donors',
      desc: 'Restaurants, supermarkets, event caterers, and households posting surplus food.',
      icon: <HeartHandshake className="w-6 h-6 text-emerald-400" />,
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    {
      role: 'NGO',
      title: 'NGOs & Shelters',
      desc: 'Verified non-profits and food banks claiming donations and feeding communities.',
      icon: <Building2 className="w-6 h-6 text-blue-400" />,
      badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    },
    {
      role: 'VOLUNTEER',
      title: 'Rescue Volunteers',
      desc: 'Local drivers and couriers broadcasting live location during transit and delivery.',
      icon: <Users className="w-6 h-6 text-amber-400" />,
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    },
    {
      role: 'ADMIN',
      title: 'Platform Admins',
      desc: 'Monitoring real-time audits, verification workflows, metrics, and safety flags.',
      icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
      badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <HeartHandshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">
                FoodRescue
              </span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                Monorepo
              </span>
            </div>
          </div>

          {/* Connection Status Badges */}
          <div className="flex items-center gap-3">
            {/* Socket Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                socketConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {socketConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>Socket.IO Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Socket Offline</span>
                </>
              )}
            </div>

            {/* API Health */}
            <button
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Click to check API health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>{healthData ? `API: ${healthData.status}` : 'Check API'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Full-Stack Real-Time Platform Initialized
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stop Food Waste.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Feed Communities.
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            A real-time dispatch and tracking platform connecting food donors, certified NGOs,
            and volunteer couriers through high-performance WebSockets and TypeScript state machines.
          </p>
        </section>

        {/* Backend & Environment Status Card */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>BACKEND API</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {healthData ? healthData.status.toUpperCase() : 'CONNECTING...'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Port: 5000 • Env: {healthData?.environment || 'dev'}
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>SOCKET.IO CLIENTS</span>
              <Wifi className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {healthData ? `${healthData.activeSockets} Active` : '0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {socketConnected ? 'Connected to ws://localhost:5000' : 'Disconnected'}
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>DATABASE STATUS</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white capitalize">
              {healthData?.database || 'Standby'}
            </div>
            <p className="text-xs text-slate-500 mt-1">MongoDB Mongoose 8.x</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>SYSTEM UPTIME</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {healthData ? `${Math.round(healthData.uptime)}s` : '0s'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Last check: {lastPing || 'Pending'}</p>
          </div>
        </section>

        {/* Finite State Machine (FSM) Lifecycle Visualizer */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Donation Status Finite State Machine</h2>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-mono">
                  FSM Engine
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Strict lifecycle transitions enforced on backend and validated on client.
              </p>
            </div>
            <div className="text-xs font-medium text-slate-400">
              Selected Stage:{' '}
              <span className="text-emerald-400 font-semibold">{activeFsmStep}</span>
            </div>
          </div>

          {/* FSM Stepper Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {fsmSteps.map((step) => {
              const isActive = activeFsmStep === step.status;
              return (
                <button
                  key={step.status}
                  onClick={() => setActiveFsmStep(step.status)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                    isActive
                      ? `${step.color} shadow-lg ring-1 ring-emerald-500/40`
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-slate-950/60">{step.icon}</span>
                    <span className="text-[10px] font-mono tracking-wider opacity-70 uppercase">
                      {step.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">{step.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* User Roles & Permissions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">User Roles & Architectural Layers</h2>
              <p className="text-sm text-slate-400">
                Configured role-based access control (RBAC) definitions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((r) => (
              <div
                key={r.role}
                className="bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/60">
                    {r.icon}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${r.badgeColor}`}
                  >
                    {r.role}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{r.title}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{r.desc}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Scope: Full Access</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>FoodRescue Platform Monorepo • Node.js + Express + TypeScript + Socket.IO + React + Vite + Tailwind CSS</p>
      </footer>
    </div>
  );
}

export default App;

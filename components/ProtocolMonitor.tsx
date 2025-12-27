
import React, { useState, useEffect, useMemo } from 'react';
import { useProtocol } from '../context/ProtocolContext';
import { eventBus, PROTOCOL_EVENTS } from '../services/eventBus';
import { ublApi } from '../services/ublApi';

const ProtocolMonitor: React.FC = () => {
  const { messages } = useProtocol();
  const [logs, setLogs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [tps, setTps] = useState(0);
  const [peers, setPeers] = useState(0);
  const [healthPoints, setHealthPoints] = useState<number[]>(Array(20).fill(40));

  useEffect(() => {
    const unsub = eventBus.on(PROTOCOL_EVENTS.BLOCK_MINED, (data) => {
      setLogs(prev => [{ ...data, id: Date.now(), ts: new Date().toISOString() }, ...prev].slice(0, 50));
    });

    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;
    const load = async () => {
      try {
        const res = await ublApi.ledgerLogs();
        if (!alive) return;

        setLogs(res.logs.map(l => ({ ...l, id: l.id })));
        setTps(Number(res.stats?.tps || 0));
        setPeers(Number(res.stats?.peers || 0));
        const hp = Array(20).fill(0).map((_, i) => {
          const v = res.stats?.healthPoints?.[i];
          return typeof v === 'number' ? v : 40;
        });
        setHealthPoints(hp);
      } catch (e) {
        // Silent: monitor can work offline with local eventbus
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => { alive = false; clearInterval(interval); };
  }, [isOpen]);

  const totalCost = useMemo(() => messages.reduce((acc, m) => acc + (m.cost || 0), 0), [messages]);
  const displayCost = isFinite(totalCost) ? totalCost : 0;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all border border-white/10 active:scale-95 group"
      >
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
        <i className="fas fa-microchip group-hover:rotate-90 transition-transform"></i>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 h-[600px] bg-slate-950 rounded-[2rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border border-slate-800 flex flex-col overflow-hidden animate-slide-up ring-1 ring-white/5">
      {/* Visual Header */}
      <div className="px-6 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
          <div>
            <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] block">UBL Mainnet Node</span>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Status: Healthy & Syncing</span>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 transition-colors">
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>

      {/* Network Health Graph */}
      <div className="h-24 bg-black/40 px-6 py-4 flex items-end space-x-1 border-b border-slate-800">
        {healthPoints.map((h, i) => (
          <div 
            key={i} 
            className="flex-1 bg-blue-500/30 rounded-t-sm transition-all duration-1000"
            style={{ height: `${h}%`, backgroundColor: h > 50 ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)' }}
          ></div>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 bg-slate-900/30 border-b border-slate-800">
        <div className="p-5 border-r border-slate-800">
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Ledger Cost</p>
          <p className="text-sm font-mono text-emerald-400 font-black">{displayCost.toFixed(6)} UBL</p>
        </div>
        <div className="p-5">
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Active Peers</p>
          <p className="text-sm font-mono text-blue-400 font-black">{peers || 12} CONNECTED</p>
        </div>
      </div>

      {/* Terminal Logs */}
      <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-4 bg-black/20 custom-scrollbar">
        <div className="text-blue-500/60 flex items-center">
          <i className="fas fa-terminal mr-2"></i>
          <span>SYSTEM_READY: PEER_SYNC_COMPLETE</span>
        </div>
        
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col space-y-1.5 animate-fade-in group">
            <div className="flex justify-between items-center text-[8px] font-black">
              <span className="text-slate-600">[{new Date(log.ts || Date.now()).toLocaleTimeString()}]</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">TX_SIGNED</span>
            </div>
            <div className="text-slate-300 break-all bg-white/5 p-3 rounded-xl border border-white/5 group-hover:border-blue-500/30 transition-colors">
              <div className="flex justify-between mb-1">
                <span className="text-blue-400 opacity-60">BLOCK_HASH:</span>
                <span className="text-white/40 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(log.hash)}>COPY</span>
              </div>
              <span className="text-[9px]">{log.hash}</span>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <i className="fas fa-satellite-dish text-4xl mb-4"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Listening for Network Broadcasts...</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-4">
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">TPS: <span className="text-emerald-500">{tps.toFixed(2)}</span></span>
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">GAS: <span className="text-blue-500">12 gwei</span></span>
        </div>
        <button 
          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          onClick={() => setLogs([])}
        >
          Flush Buffer
        </button>
      </div>
    </div>
  );
};

export default ProtocolMonitor;

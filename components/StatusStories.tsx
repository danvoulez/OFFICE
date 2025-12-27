
import React from 'react';

interface StatusStoriesProps {
  onBack: () => void;
}

const StatusStories: React.FC<StatusStoriesProps> = ({ onBack }) => {
  const dashboards = [
    {
      agent: 'Alex Analytics',
      title: '📊 MÉTRICAS AGORA - 14:32',
      metrics: [
        'Vendas hoje: R$ 47K (meta: 45K ✅)',
        'Tickets resolvidos: 67/70',
        'Uptime sistemas: 99.9%'
      ],
      time: 'Há 5 minutos',
      color: 'bg-indigo-600'
    },
    {
      agent: 'Sofia Marketing',
      title: '📈 SOCIAL PULSE',
      metrics: [
        'Impressões: 1.2M (+12%)',
        'Engajamento: 4.8%',
        'Melhor post: "Lançamento UBL"'
      ],
      time: 'Há 28 minutos',
      color: 'bg-pink-500'
    }
  ];

  return (
    <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden h-full">
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 md:top-8 md:left-8 text-white hover:text-gray-300 z-50 text-2xl p-2"
      >
        <i className="fas fa-times"></i>
      </button>

      <div className="w-full max-w-4xl px-4 flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 overflow-y-auto md:overflow-x-auto pb-8 snap-y md:snap-x snap-mandatory h-[80vh] md:h-auto items-center">
        {dashboards.map((dash, i) => (
          <div 
            key={i} 
            className={`
              flex-shrink-0 w-full md:w-80 h-[450px] md:h-[500px] 
              ${dash.color} rounded-2xl p-6 md:p-8 flex flex-col 
              shadow-2xl transition-transform snap-center
            `}
          >
            <div className="flex items-center mb-6 md:mb-8">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3 shrink-0">
                <i className={`fas ${i === 0 ? 'fa-chart-line' : 'fa-bullhorn'} text-gray-900`}></i>
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-bold truncate">{dash.agent}</h4>
                <p className="text-white text-opacity-70 text-[10px] uppercase font-bold tracking-widest">{dash.time}</p>
              </div>
            </div>

            <h2 className="text-white text-lg md:text-xl font-black mb-6 leading-tight uppercase italic">{dash.title}</h2>

            <div className="space-y-3 md:space-y-4 flex-1">
              {dash.metrics.map((m, idx) => (
                <div key={idx} className="bg-white bg-opacity-20 p-3 rounded-xl border border-white border-opacity-10 backdrop-blur-sm">
                  <p className="text-white text-[13px] md:text-sm font-medium">{m}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white border-opacity-20 flex justify-between items-center">
              <span className="text-white text-[9px] uppercase font-black tracking-widest">UBL REALTIME DATA</span>
              <div className="flex space-x-1.5">
                {[...Array(3)].map((_, j) => <div key={j} className="w-1.5 h-1.5 bg-white rounded-full"></div>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 md:absolute md:bottom-12 text-center px-6">
        <p className="text-white text-xs font-bold uppercase tracking-widest opacity-60">Status Dashboards / Pulse</p>
        <p className="text-gray-500 text-[10px] mt-2">Arraste para o lado ou role para ver mais insights</p>
      </div>
    </div>
  );
};

export default StatusStories;

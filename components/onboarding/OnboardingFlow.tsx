
import React, { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import Button from '../ui/Button';

const OnboardingFlow: React.FC = () => {
  const { step, setStep, provisionTenant, joinTenant, completeProfile } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  // Form states
  const [tenantName, setTenantName] = useState('');
  const [domain, setDomain] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAbout, setUserAbout] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(() => Math.random().toString(36).slice(2, 10));

  const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  const handleTenantProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await provisionTenant(tenantName, domain.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await joinTenant(inviteCode.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await completeProfile({ name: userName, role: userRole, phone: userPhone, about: userAbout, avatar: avatarUrl, status: 'online' });
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20 animate-pulse">
          <i className="fas fa-cube text-3xl"></i>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-[0.3em] mb-4">UBL Protocol</h1>
        <p className="text-slate-400 max-w-md text-sm leading-relaxed mb-12 font-medium tracking-wide">
          Universal Business Ledger. Every interaction is an entry. 
          Every agent is a node. Enterprise execution starts here.
        </p>
        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">New</p>
            <h3 className="text-white font-black text-xl uppercase tracking-widest mt-2">Create Organization</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">Provision a new namespace on the UBL network. You'll get an invite code to share.</p>
            <Button
              size="lg"
              className="w-full py-5 !text-[11px] mt-6"
              onClick={() => {
                setMode('create');
                setInviteCode('');
                setError('');
                setStep('tenant');
              }}
            >
              Provision Namespace
            </Button>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Existing</p>
            <h3 className="text-white font-black text-xl uppercase tracking-widest mt-2">Join Organization</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">Enter an invitation code issued by an admin and synchronize their ledger.</p>
            <button
              onClick={() => {
                setMode('join');
                setError('');
                setStep('tenant');
              }}
              className="w-full mt-6 py-5 rounded-2xl border border-slate-700 text-[11px] font-black uppercase tracking-widest text-slate-200 hover:bg-slate-900/60 transition-all"
            >
              I have an invite code
            </button>
          </div>
        </div>
        <div className="mt-20 flex space-x-8 opacity-20">
           <i className="fab fa-ethereum text-2xl"></i>
           <i className="fas fa-shield-halved text-2xl"></i>
           <i className="fas fa-network-wired text-2xl"></i>
        </div>
      </div>
    );
  }

  if (step === 'tenant') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
          <div className="p-10">
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Namespace Provisioning</h2>
            <p className="text-slate-400 text-xs font-medium mb-8">Define your organization's domain on the UBL Mainnet.</p>

            {error && (
              <div className="mb-8 bg-red-950/40 border border-red-800 text-red-200 rounded-2xl px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <i className="fas fa-triangle-exclamation"></i>
                  <span className="font-semibold">{error}</span>
                </div>
              </div>
            )}
            
            <div className="flex bg-slate-950 p-1 rounded-xl mb-8 border border-slate-800">
              <button
                type="button"
                onClick={() => { setMode('create'); setError(''); }}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >Create Organization</button>
              <button
                type="button"
                onClick={() => { setMode('join'); setError(''); }}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'join' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >Join Existing</button>
            </div>

            {mode === 'join' ? (
              <form onSubmit={handleJoin} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Enterprise Invitation Code</label>
                  <input 
                    required
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    placeholder="UBL-XXXX-XXXX"
                    className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-mono text-blue-400 focus:border-blue-500 outline-none rounded-xl"
                  />
                </div>
                <Button className="w-full py-4" isLoading={loading} disabled={inviteCode.trim().length < 3}>Validate Invite</Button>
              </form>
            ) : (
              <form onSubmit={handleTenantProvision} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Organization Name</label>
                  <input 
                    required
                    value={tenantName}
                    onChange={e => setTenantName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-medium text-white focus:border-blue-500 outline-none rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Ledger Domain</label>
                  <div className="relative">
                    <input 
                      required
                      value={domain}
                      onChange={e => setDomain(e.target.value)}
                      placeholder="acme"
                      className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-mono text-emerald-400 focus:border-emerald-500 outline-none rounded-xl"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">.ubl.net</span>
                  </div>
                </div>
                <Button className="w-full py-4" isLoading={loading} disabled={!tenantName.trim() || !domain.trim()}>Provision Node</Button>
              </form>
            )}
          </div>
          <div className="bg-slate-950/50 p-6 flex items-center justify-between border-t border-slate-800">
             <button onClick={() => setStep('welcome')} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">
                <i className="fas fa-arrow-left mr-2"></i> Back
             </button>
             <span className="text-[8px] font-mono text-slate-700">NODE_VERSION: 1.4.2-STABLE</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
          <div className="p-10">
             <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Protocol Identity</h2>
             <p className="text-slate-400 text-xs font-medium mb-10">Your name will be hashed alongside every message you sign.</p>

             {error && (
               <div className="mb-8 bg-red-950/40 border border-red-800 text-red-200 rounded-2xl px-4 py-3 text-sm">
                 <div className="flex items-center gap-2">
                   <i className="fas fa-triangle-exclamation"></i>
                   <span className="font-semibold">{error}</span>
                 </div>
               </div>
             )}
             
             <form onSubmit={handleProfileComplete} className="space-y-8">
                <div className="flex items-center space-x-6">
                   <div className="relative">
                     <button
                       type="button"
                       onClick={() => setAvatarSeed(Math.random().toString(36).slice(2, 10))}
                       title="Randomize avatar"
                       className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition-all"
                     >
                       <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                     </button>
                     <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center border-4 border-[#0f172a] shadow-lg">
                       <i className="fas fa-dice" />
                     </div>
                   </div>
                   <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Full Professional Name</label>
                      <input 
                        required
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-medium text-white focus:border-blue-500 outline-none rounded-xl"
                      />
                   </div>
                </div>

                <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Designated Role / Title</label>
                   <input 
                    required
                    value={userRole}
                    onChange={e => setUserRole(e.target.value)}
                    placeholder="Chief of Operations"
                    className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-medium text-white focus:border-blue-500 outline-none rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Phone (optional)</label>
                    <input
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+351 …"
                      className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-medium text-white focus:border-blue-500 outline-none rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                    <div className="w-full bg-slate-950 border border-slate-800 px-5 py-4 rounded-xl text-sm font-medium text-emerald-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Online
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">About (optional)</label>
                  <textarea
                    value={userAbout}
                    onChange={(e) => setUserAbout(e.target.value)}
                    placeholder="What should collaborators know?"
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 px-5 py-4 text-sm font-medium text-white focus:border-blue-500 outline-none rounded-xl resize-none"
                  />
                </div>

                <Button className="w-full py-5" isLoading={loading} disabled={!userName.trim() || !userRole.trim()}>
                  Complete Registration
                </Button>
             </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'syncing') {
    // Auto-advance after animation
    React.useEffect(() => {
      const timer = setTimeout(() => setStep('ready'), 3500);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-32 h-32 relative flex items-center justify-center mb-10">
           <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
           <i className="fas fa-database text-3xl text-blue-500"></i>
        </div>
        <h2 className="text-sm font-black uppercase tracking-[0.4em] mb-4">Synchronizing Global Ledger</h2>
        <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden mb-4">
           <div className="h-full bg-blue-500 animate-[progress_3s_ease-in-out_infinite]"></div>
        </div>
        <div className="space-y-2 text-center">
           <p className="text-[9px] font-mono text-blue-400/60 uppercase">Mounting Encrypted Filesystems...</p>
           <p className="text-[9px] font-mono text-emerald-400/60 uppercase">Negotiating Peer-to-Peer Handshake...</p>
           <p className="text-[9px] font-mono text-slate-500 uppercase">Validating Genesis Block...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default OnboardingFlow;

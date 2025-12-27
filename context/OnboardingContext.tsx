
import React, { createContext, useContext, useState } from 'react';
import { Tenant, UserSession, Entity } from '../types';
import { ublApi } from '../services/ublApi';

type OnboardingStep = 'welcome' | 'tenant' | 'profile' | 'syncing' | 'ready';

interface OnboardingContextType {
  session: UserSession | null;
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  provisionTenant: (name: string, domain: string) => Promise<void>;
  joinTenant: (inviteCode: string) => Promise<void>;
  completeProfile: (userData: Partial<Entity>) => Promise<void>;
  updateMe: (patch: Partial<Entity>) => Promise<Entity>;
  logout: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ubl_session');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        tenant: { ...parsed.tenant, createdAt: new Date(parsed.tenant.createdAt) }
      };
    } catch {
      return null;
    }
  });

  const [step, setStep] = useState<OnboardingStep>(() => (session ? 'ready' : 'welcome'));

  const provisionTenant = async (name: string, domain: string) => {
    const tenant = await ublApi.provisionTenant(name, domain);
    localStorage.setItem('ubl_pending_tenant', JSON.stringify(tenant));
    setStep('profile');
  };

  const joinTenant = async (inviteCode: string) => {
    if (inviteCode.trim().length < 4) throw new Error('Invalid invite code');
    const tenant = await ublApi.joinTenant(inviteCode);
    localStorage.setItem('ubl_pending_tenant', JSON.stringify(tenant));
    setStep('profile');
  };

  const completeProfile = async (userData: Partial<Entity>) => {
    const pendingTenant: Tenant = (() => {
      const raw = localStorage.getItem('ubl_pending_tenant');
      if (!raw) throw new Error('No tenant selected');
      const t = JSON.parse(raw);
      return { ...t, createdAt: new Date(t.createdAt) };
    })();

    setStep('syncing');
    try {
      const newSession = await ublApi.createSession({ tenantId: pendingTenant.id, user: userData });
      setSession(newSession);
      localStorage.setItem('ubl_session', JSON.stringify(newSession));
      localStorage.removeItem('ubl_pending_tenant');
      setStep('ready');
    } catch (e: any) {
      console.error('[Onboarding] createSession failed', e);
      setStep('profile');
      throw e;
    }
  };

  const updateMe = async (patch: Partial<Entity>) => {
    if (!session?.token) throw new Error('No active session');
    const updated = await ublApi.updateMe(patch);
    const nextSession = { ...session, user: updated };
    setSession(nextSession);
    localStorage.setItem('ubl_session', JSON.stringify(nextSession));
    return updated;
  };

  const logout = () => {
    localStorage.removeItem('ubl_session');
    setSession(null);
    setStep('welcome');
  };

  return (
    <OnboardingContext.Provider value={{
      session, step, setStep, provisionTenant, joinTenant, completeProfile, updateMe, logout
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};

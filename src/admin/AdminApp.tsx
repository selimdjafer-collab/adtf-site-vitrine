import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import Login from './Login';
import Dashboard from './Dashboard';
import GalleryManager from './GalleryManager';
import NewsManager from './NewsManager';
import NewsEditor from './NewsEditor';
import { LayoutDashboard, Images, Newspaper, LogOut, ExternalLink, ChevronRight } from 'lucide-react';

export type AdminPage = 'dashboard' | 'gallery' | 'news' | 'news-editor';

const LOGO = '/ChatGPT_Image_15_juin_2026,_12_07_44.png';

const navItems = [
  { id: 'dashboard' as AdminPage, label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'gallery'   as AdminPage, label: 'Galerie photos',  icon: Images },
  { id: 'news'      as AdminPage, label: 'Actualités',      icon: Newspaper },
];

export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Login />;

  const navigateTo = (p: AdminPage, newsId: string | null = null) => {
    setPage(p);
    setEditingNewsId(newsId);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-blue-dark flex flex-col shrink-0 fixed top-0 left-0 h-full z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <img src={LOGO} alt="ADTF" className="h-16 w-auto object-contain" />
          <p className="text-white/50 text-xs mt-2 font-semibold uppercase tracking-widest">Administration</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-3">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigateTo(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                page === id || (page === 'news-editor' && id === 'news')
                  ? 'bg-brand-green text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={17} />
              {label}
              {(page === id || (page === 'news-editor' && id === 'news')) && (
                <ChevronRight size={14} className="ml-auto" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ExternalLink size={17} />
            Voir le site
          </a>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen">
        {page === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
        {page === 'gallery'   && <GalleryManager />}
        {page === 'news'      && <NewsManager onEdit={(id) => navigateTo('news-editor', id)} onCreate={() => navigateTo('news-editor', null)} />}
        {page === 'news-editor' && (
          <NewsEditor
            editingId={editingNewsId}
            onBack={() => navigateTo('news')}
            onSaved={() => navigateTo('news')}
          />
        )}
      </main>
    </div>
  );
}

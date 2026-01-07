
import React from 'react';
import { Section } from '../types';
import { ASSETS } from '../constants';

interface HeaderProps {
  currentSection: Section;
  onNavigate: (section: Section) => void;
}

const Header: React.FC<HeaderProps> = ({ currentSection, onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-primary/10 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate('home')}
        >
          <img src={ASSETS.LOGO} alt="Nutrabene" className="h-10 w-auto object-contain" />
          <span className="text-2xl font-semibold text-primary-dark hidden sm:block font-logo">Nutrabene</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 bg-background-soft px-8 py-2.5 rounded-full border border-primary/5">
          <NavLink
            active={currentSection === 'home'}
            onClick={() => onNavigate('home')}
            label="Início"
          />
          <NavLink
            active={currentSection === 'products'}
            onClick={() => onNavigate('products')}
            label="Linha Capilar"
          />
          <NavLink
            active={currentSection === 'about'}
            onClick={() => onNavigate('about')}
            label="Quem Somos"
          />
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('register')}
            className="rounded-full bg-primary hover:bg-primary-dark text-white px-6 py-2.5 text-sm font-bold shadow-soft transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            Área do Cliente
          </button>
        </div>
      </div>
    </header>
  );
};

const NavLink: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`text-sm font-semibold transition-colors ${active ? 'text-primary' : 'text-dark-text dark:text-gray-200 hover:text-primary'}`}
  >
    {label}
  </button>
);

export default Header;

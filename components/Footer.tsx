
import React from 'react';
import { Section } from '../types';
import { ASSETS } from '../constants';

interface FooterProps {
  onNavigate: (section: Section) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white dark:bg-background-dark border-t border-primary/10 pt-16 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
              <img src={ASSETS.LOGO} alt="Nutrabene" className="h-12 w-auto object-contain" />
              <span className="text-2xl font-bold text-primary-dark">Nutrabene</span>
            </div>
            <p className="text-muted-text text-sm leading-relaxed">
              Transformando sua beleza e vitalidade através de nutrição inteligente e biotecnologia natural.
            </p>
            <div className="flex gap-4">
              <SocialIcon icon="public" />
              <SocialIcon icon="thumb_up" />
              <SocialIcon icon="photo_camera" />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-dark-text dark:text-white mb-6">Empresa</h4>
            <ul className="flex flex-col gap-4 text-sm text-muted-text">
              <li><button onClick={() => onNavigate('home')} className="hover:text-primary transition-colors">Início</button></li>
              <li><button onClick={() => onNavigate('products')} className="hover:text-primary transition-colors">Produtos</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-primary transition-colors text-left">Quem Somos</button></li>
              <li><button className="hover:text-primary transition-colors text-left">Carreiras</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-dark-text dark:text-white mb-6">Suporte</h4>
            <ul className="flex flex-col gap-4 text-sm text-muted-text">
              <li><button className="hover:text-primary transition-colors text-left">Centro de Ajuda</button></li>
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-primary transition-colors text-left">Políticas de Privacidade</button></li>
              <li><button className="hover:text-primary transition-colors text-left">Termos de Uso</button></li>
              <li><button className="hover:text-primary transition-colors text-left">FAQ</button></li>
            </ul>
          </div>

          <div className="bg-background-soft dark:bg-white/5 p-6 rounded-2xl border border-primary/5">
            <h4 className="font-bold text-dark-text dark:text-white mb-2">Fique Atualizado</h4>
            <p className="text-xs text-muted-text mb-4">Receba dicas de saúde e ofertas exclusivas no seu e-mail.</p>
            <div className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="h-10 px-4 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
              <button className="h-10 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-all">
                Inscrever
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-text">
            © 2024 Nutrabene. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs text-muted-text">
            <a href="#" className="hover:text-primary">Privacidade</a>
            <a href="#" className="hover:text-primary">Termos</a>
            <a href="#" className="hover:text-primary">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialIcon: React.FC<{ icon: string }> = ({ icon }) => (
  <button className="w-10 h-10 rounded-full border border-primary/10 flex items-center justify-center text-primary-dark hover:bg-primary hover:text-white transition-all">
    <span className="material-symbols-outlined text-xl">{icon}</span>
  </button>
);

export default Footer;


import React from 'react';
import { Section } from '../types';
import { ASSETS } from '../constants';

interface HeroProps {
  onNavigate: (section: Section) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section className="relative w-full py-12 md:py-20 px-6 overflow-hidden bg-white dark:bg-background-dark">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
        <div className="flex flex-col gap-10 order-2 lg:order-1 max-w-2xl">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-3 self-start rounded-full bg-primary-light/50 backdrop-blur-md border border-primary/20 px-5 py-2.5 shadow-sm">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-primary-dark uppercase tracking-[0.2em]">Cuidado Capilar Avançado</span>
            </div>

            <h1 className="text-dark-text dark:text-white text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight">
              Queda capilar se trata no <span className="text-primary italic">detalhe</span>.
            </h1>

            <p className="text-muted-text dark:text-gray-300 text-lg md:text-xl font-medium leading-relaxed">
              A queda capilar tem solução e começa com um tratamento natural de alta performance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <button
              onClick={() => onNavigate('products')}
              className="group flex items-center justify-center gap-3 rounded-2xl h-16 px-10 bg-primary hover:bg-primary-dark text-white font-bold shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
            >
              Conheça os Produtos
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="flex items-center justify-center rounded-2xl h-16 px-10 bg-white dark:bg-white/5 border-2 border-primary/10 dark:border-white/10 text-dark-text dark:text-white font-bold transition-all hover:bg-primary/5 hover:border-primary/20 active:scale-95"
            >
              Fazer Avaliação Gratuita
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 pt-10 border-t border-gray-100 dark:border-white/10">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-14 h-14 rounded-full border-4 border-white dark:border-background-dark shadow-lg overflow-hidden transition-transform hover:scale-110 hover:z-30">
                  <img src={`https://picsum.photos/120/120?random=${i + 10}`} alt="Customer" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-14 h-14 rounded-full border-4 border-white dark:border-background-dark bg-primary-light flex items-center justify-center text-xs font-black text-primary-dark shadow-lg">
                +3k
              </div>
            </div>
            <div>
              <div className="flex text-[#FFD700] gap-0.5 mb-1.5">
                {[1, 2, 3, 4, 5].map(i => <span key={i} className="material-symbols-outlined text-base icon-filled">star</span>)}
              </div>
              <p className="text-sm font-bold text-dark-text dark:text-gray-200">
                <span className="text-primary">+3.000 clientes</span> plenamente realizados
              </p>
            </div>
          </div>
        </div>

        <div className="relative order-1 lg:order-2">
          <div className="relative w-full aspect-[3/4] max-w-lg mx-auto">
            {/* Artistic blurred accents */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[60px] animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-[60px]"></div>

            <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-[0_32px_80px_-20px_rgba(143,168,118,0.3)] group border border-primary/5">
              <img
                src={ASSETS.HERO_IMAGE}
                alt="Nutrabene - Beleza e Saúde"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            </div>

            {/* Floating Glass Cards */}
            <div className="absolute top-[15%] -left-6 md:-left-12 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 animate-bounce-slow z-20">
              <div className="flex items-center gap-4">
                <div className="bg-white shadow-lg p-2 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <img src={ASSETS.LOGO} alt="Nutrabene" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-xs text-primary font-black uppercase tracking-widest">Natural</p>
                  <p className="text-base font-bold text-dark-text dark:text-white">100% Vegano</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-[20%] -right-6 md:-right-12 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 z-20">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center gap-8">
                  <span className="text-sm font-black text-dark-text dark:text-white uppercase tracking-wider">Eficácia</span>
                  <span className="material-symbols-outlined text-primary icon-filled">verified</span>
                </div>
                <div className="flex gap-1.5 h-2 w-40 bg-primary/10 rounded-full overflow-hidden">
                  <div className="w-[95%] bg-primary rounded-full shadow-[0_0_10px_rgba(143,168,118,0.5)]"></div>
                </div>
                <p className="text-[10px] text-muted-text font-bold text-right pt-0.5">95% de Recomendações</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

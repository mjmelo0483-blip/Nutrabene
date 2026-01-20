import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import AboutUs from './components/AboutUs';
import PrivacyPolicy from './components/PrivacyPolicy';
import ProductShowcase from './components/ProductShowcase';
import ProductDetail from './components/ProductDetail';
import RegistrationForm from './components/RegistrationForm';
import Footer from './components/Footer';
import SmartAssistant from './components/SmartAssistant';
import BenefitsSection from './components/BenefitsSection';
import HowItWorks from './components/HowItWorks';
import Testimonials from './components/Testimonials';
import AdminDashboard from './components/AdminDashboard';
import { Section, Product } from './types';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Read URL hash on load and navigate to the correct section
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Section;
    const validSections: Section[] = ['home', 'products', 'register', 'about', 'privacy', 'admin'];
    if (hash && validSections.includes(hash)) {
      setCurrentSection(hash);
    }
  }, []);

  // Smooth scroll to top when section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSection, selectedProduct]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
  };

  const renderContent = () => {
    // If a product is selected, show detail page
    if (selectedProduct) {
      return <ProductDetail product={selectedProduct} onBack={handleBackToProducts} />;
    }

    switch (currentSection) {
      case 'home':
        return (
          <>
            <Hero onNavigate={setCurrentSection} />
            <BenefitsSection />
            <HowItWorks />
            <ProductShowcase onProductSelect={handleProductSelect} />
            <Testimonials />
            <div className="bg-white dark:bg-background-dark py-16">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Client Area Card */}
                  <div className="bg-primary-light/30 dark:bg-primary/10 rounded-[3rem] p-10 md:p-14 text-center relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/10 transition-all border border-primary/5">
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">person</span>
                      </div>
                      <h2 className="text-3xl font-extrabold text-dark-text dark:text-white mb-4">Área do Cliente</h2>
                      <p className="text-muted-text dark:text-gray-300 mb-8 max-w-xs mx-auto text-sm font-medium">
                        Acesse seus dados, acompanhe seu progresso e receba dicas personalizadas para sua jornada.
                      </p>
                      <button
                        onClick={() => setCurrentSection('register')}
                        className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-primary/20 hover:-translate-y-1 active:scale-95"
                      >
                        Acessar Portal
                      </button>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                  </div>

                  {/* Admin Area Card */}
                  <div className="bg-dark-text/5 dark:bg-white/5 rounded-[3rem] p-10 md:p-14 text-center relative overflow-hidden group hover:shadow-2xl transition-all border border-gray-100 dark:border-white/5">
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 bg-dark-text dark:bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                      </div>
                      <h2 className="text-3xl font-extrabold text-dark-text dark:text-white mb-4">Área Administrativa</h2>
                      <p className="text-muted-text dark:text-gray-300 mb-8 max-w-xs mx-auto text-sm font-medium">
                        Gestão de clientes, configurações de mensagens e monitoramento da plataforma Nutrabene.
                      </p>
                      <button
                        onClick={() => setCurrentSection('admin')}
                        className="bg-dark-text dark:bg-white/10 hover:bg-black dark:hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl hover:-translate-y-1 active:scale-95"
                      >
                        Painel de Controle
                      </button>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-dark-text/5 rounded-full blur-3xl -ml-16 -mb-16 group-hover:scale-150 transition-transform duration-700"></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'products':
        return <ProductShowcase onProductSelect={handleProductSelect} />;
      case 'register':
        return <RegistrationForm onComplete={() => setCurrentSection('home')} />;
      case 'about':
        return <AboutUs />;
      case 'privacy':
        return <PrivacyPolicy />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Hero onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark transition-colors duration-300">
      {currentSection !== 'admin' && (
        <Header
          currentSection={currentSection}
          onNavigate={(section) => {
            setSelectedProduct(null);
            setCurrentSection(section);
          }}
        />
      )}

      <main className="flex-1">
        {renderContent()}
      </main>

      {currentSection !== 'admin' && (
        <Footer onNavigate={(section) => {
          setSelectedProduct(null);
          setCurrentSection(section);
        }} />
      )}

      {/* Floating Action Button for AI Assistant */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary-dark text-white w-16 h-16 rounded-3xl shadow-2xl shadow-primary/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group overflow-hidden"
        title="Assistente Inteligente Nutrabene"
      >
        <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-12">smart_toy</span>
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
      </button>

      <SmartAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
};

export default App;

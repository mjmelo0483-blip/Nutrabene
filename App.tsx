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
            <div className="bg-white dark:bg-background-dark py-12">
              <div className="max-w-7xl mx-auto px-6">
                <div className="bg-primary-light/30 dark:bg-primary/10 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-dark-text dark:text-white mb-6">Pronta para sua transformação?</h2>
                    <p className="text-muted-text dark:text-gray-300 mb-10 max-w-xl mx-auto text-lg font-medium">
                      Junte-se a milhares de mulheres que redescobriram sua beleza através da nutrição inteligente.
                    </p>
                    <button
                      onClick={() => setCurrentSection('register')}
                      className="bg-primary hover:bg-primary-dark text-white px-10 py-5 rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 hover:-translate-y-1"
                    >
                      Começar Minha Jornada Agora
                    </button>
                  </div>
                  {/* Decorative blurred backgrounds */}
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -mr-40 -mt-20"></div>
                  <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -ml-20 -mb-20"></div>
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
      <Header
        currentSection={currentSection}
        onNavigate={(section) => {
          setSelectedProduct(null);
          setCurrentSection(section);
        }}
      />

      <main className="flex-1">
        {renderContent()}
      </main>

      <Footer onNavigate={(section) => {
        setSelectedProduct(null);
        setCurrentSection(section);
      }} />

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

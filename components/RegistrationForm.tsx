
import React, { useState } from 'react';
import { ASSETS } from '../constants';
import { supabase } from '../services/supabase';

interface RegistrationFormProps {
  onComplete: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    birthDate: '',
    sleepSchedule: '',
    purchaseLocation: '',
    establishmentName: ''
  });

  const requiresEstablishmentName = formData.purchaseLocation === 'revendedor_parceiro' || formData.purchaseLocation === 'outros';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('registrations')
        .insert([{
          name: formData.name,
          email: formData.email,
          whatsapp: formData.whatsapp,
          birth_date: formData.birthDate,
          sleep_schedule: formData.sleepSchedule,
          purchase_location: formData.purchaseLocation,
          establishment_name: requiresEstablishmentName ? formData.establishmentName : null
        }]);

      if (submitError) throw submitError;

      setSuccess(true);
      setTimeout(onComplete, 2500);
    } catch (err: any) {
      console.error('Erro ao cadastrar:', err);
      setError('Houve um erro ao processar seu cadastro. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light px-6 py-20">
        <div className="max-w-md w-full bg-white dark:bg-white/5 p-10 rounded-3xl shadow-2xl text-center border border-primary/20">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
          </div>
          <h2 className="text-3xl font-bold text-dark-text dark:text-white mb-2">Sucesso!</h2>
          <p className="text-muted-text">Seu cadastro foi concluído. Bem-vindo à Nutrabene.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen py-16 px-6 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
        {/* Left Visual Info */}
        <div className="hidden lg:flex flex-col flex-1 gap-8 sticky top-28">
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl">
            <img src={ASSETS.REGISTER_IMAGE} alt="Wellness" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-text/80 to-transparent flex flex-col justify-end p-8">
              <h3 className="text-white text-3xl font-bold mb-2">Nutrição que transforma</h3>
              <p className="text-white/80">Descubra o equilíbrio perfeito entre natureza e ciência.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary/5">
              <span className="material-symbols-outlined text-primary mb-2">local_florist</span>
              <h4 className="font-bold text-dark-text">100% Orgânico</h4>
              <p className="text-xs text-muted-text">Cultivo sustentável e responsável.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary/5">
              <span className="material-symbols-outlined text-primary mb-2">self_improvement</span>
              <h4 className="font-bold text-dark-text">Bem-estar</h4>
              <p className="text-xs text-muted-text">Fórmulas para o seu equilíbrio.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 w-full max-w-xl mx-auto">
          <div className="bg-white dark:bg-white/5 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-primary-dark"></div>

            <h2 className="text-4xl font-extrabold text-dark-text dark:text-white mb-4">Cadastre-se</h2>
            <p className="text-muted-text dark:text-gray-400 mb-8">Junte-se à comunidade Nutrabene e receba conteúdos exclusivos e ofertas especiais.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 italic">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-dark-text dark:text-gray-300">Nome Completo</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary">person</span>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    type="text"
                    placeholder="Digite seu nome completo"
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-dark-text dark:text-gray-300">E-mail</label>
                  <input
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full h-14 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-dark-text dark:text-gray-300">WhatsApp</label>
                  <input
                    required
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="w-full h-14 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-dark-text dark:text-gray-300">Data de Nascimento</label>
                  <input
                    required
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    type="date"
                    className="w-full h-14 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-dark-text dark:text-gray-300">Horário do Sono</label>
                  <input
                    required
                    name="sleepSchedule"
                    value={formData.sleepSchedule}
                    onChange={handleChange}
                    type="time"
                    className="w-full h-14 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-dark-text dark:text-gray-300">Local de Compra</label>
                <select
                  required
                  name="purchaseLocation"
                  value={formData.purchaseLocation}
                  onChange={handleChange}
                  className="w-full h-14 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary outline-none appearance-none"
                >
                  <option value="" disabled>Selecione onde comprou</option>
                  <option value="site_oficial">Site Oficial</option>
                  <option value="tiktokshop">TikTokshop</option>
                  <option value="revendedor_parceiro">Revendedor Parceiro</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              {requiresEstablishmentName && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-dark-text dark:text-gray-300">
                    Nome do Estabelecimento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary">storefront</span>
                    <input
                      required
                      name="establishmentName"
                      value={formData.establishmentName}
                      onChange={handleChange}
                      type="text"
                      placeholder="Digite o nome do estabelecimento"
                      className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 mt-2 bg-primary-light/30 p-4 rounded-xl border border-primary/10">
                <input required type="checkbox" className="mt-1 rounded text-primary border-primary focus:ring-primary" />
                <label className="text-sm text-muted-text">
                  Concordo com os <button type="button" className="font-bold text-primary">Termos de Uso</button> e aceito receber comunicações.
                </label>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full h-14 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Processando...' : (
                  <>
                    Finalizar Cadastro
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegistrationForm;

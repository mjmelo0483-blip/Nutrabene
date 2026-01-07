import React from 'react';

const steps = [
    {
        number: '01',
        title: 'Avaliação Digital',
        desc: 'Preencha nosso formulário inteligente para entendermos seus objetivos de saúde e rotina.',
        icon: 'psychology'
    },
    {
        number: '02',
        title: 'Análise de Ativos',
        desc: 'Nossa inteligência seleciona os melhores componentes botânicos para o seu perfil único.',
        icon: 'biotech'
    },
    {
        number: '03',
        title: 'Plano Personalizado',
        desc: 'Receba uma recomendação completa de nutrientes e cuidados para sua transformação.',
        icon: 'auto_awesome_motion'
    },
    {
        number: '04',
        title: 'Acompanhamento',
        desc: 'Suporte contínuo para ajustar sua jornada e garantir resultados extraordinários.',
        icon: 'favorite'
    }
];

const HowItWorks: React.FC = () => {
    return (
        <section className="py-24 px-6 bg-white dark:bg-background-dark">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-primary font-black uppercase tracking-[0.25em] text-sm mb-4">O Processo</h2>
                    <h3 className="text-4xl md:text-5xl font-extrabold text-dark-text dark:text-white mb-6">Como criamos sua <span className="text-primary">fórmula</span>.</h3>
                    <p className="text-muted-text dark:text-gray-400 max-w-2xl mx-auto text-lg font-medium">
                        Um caminho simples e tecnológico para a sua melhor versão.
                    </p>
                </div>

                <div className="relative">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden lg:block absolute top-[2.75rem] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {steps.map((step, index) => (
                            <div key={index} className="flex flex-col items-center text-center group">
                                <div className="relative mb-8">
                                    <div className="w-20 h-20 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white shadow-xl shadow-primary/10">
                                        <span className="material-symbols-outlined text-3xl font-bold">{step.icon}</span>
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-4 border-primary/20 dark:border-primary/40 flex items-center justify-center">
                                        <span className="text-xs font-black text-primary">{step.number}</span>
                                    </div>
                                </div>
                                <h4 className="text-xl font-bold text-dark-text dark:text-white mb-4">{step.title}</h4>
                                <p className="text-muted-text dark:text-gray-400 text-sm leading-relaxed max-w-[240px]">
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;

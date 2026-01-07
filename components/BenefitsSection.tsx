import React from 'react';

const benefits = [
    {
        icon: 'assignment_turned_in',
        title: 'Análise Bio-Individual',
        desc: 'Cada jornada é única. Começamos com uma avaliação profunda do seu perfil metabólico e necessidades nutricionais.',
        color: 'bg-primary/10',
        iconColor: 'text-primary'
    },
    {
        icon: 'eco',
        title: 'Pureza Botânica',
        desc: 'Utilizamos apenas ativos naturais e veganos de alta performance, sem substâncias químicas agressivas ou parabenos.',
        color: 'bg-emerald-50 dark:bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
        icon: 'science',
        title: 'Biotecnologia Avançada',
        desc: 'Ciência e natureza em harmonia. Nossas fórmulas são validadas por testes laboratoriais rigorosos de eficácia.',
        color: 'bg-blue-50 dark:bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
        icon: 'auto_awesome',
        title: 'Resultados Visíveis',
        desc: 'Transformação real que você sente na pele e vê no espelho, com foco em saúde capilar e vitalidade celular.',
        color: 'bg-amber-50 dark:bg-amber-500/10',
        iconColor: 'text-amber-600 dark:text-amber-400'
    }
];

const BenefitsSection: React.FC = () => {
    return (
        <section className="py-24 px-6 bg-background-soft/30 dark:bg-background-dark/50 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-primary font-black uppercase tracking-[0.25em] text-sm mb-4">Nossa Essência</h2>
                        <h3 className="text-4xl md:text-5xl font-extrabold text-dark-text dark:text-white leading-tight">
                            Onde a Ciência encontra o <span className="text-primary">Bem-estar</span>.
                        </h3>
                    </div>
                    <p className="text-muted-text dark:text-gray-400 max-w-sm text-lg font-medium">
                        Desenvolvemos uma abordagem holística para sua saúde, focada em nutrir sua melhor versão de dentro para fora.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {benefits.map((benefit, index) => (
                        <div
                            key={index}
                            className="group relative p-10 rounded-[2.5rem] bg-white dark:bg-white/5 border border-primary/5 hover:border-primary/20 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2"
                        >
                            <div className={`w-16 h-16 rounded-2xl ${benefit.color} flex items-center justify-center ${benefit.iconColor} mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                                <span className="material-symbols-outlined text-3xl font-bold">{benefit.icon}</span>
                            </div>
                            <h4 className="text-xl font-bold text-dark-text dark:text-white mb-4 group-hover:text-primary transition-colors">{benefit.title}</h4>
                            <p className="text-muted-text dark:text-gray-400 text-sm leading-relaxed font-medium">
                                {benefit.desc}
                            </p>

                            {/* Subtle accent line on hover */}
                            <div className="absolute bottom-8 left-10 right-10 h-0.5 bg-primary/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BenefitsSection;

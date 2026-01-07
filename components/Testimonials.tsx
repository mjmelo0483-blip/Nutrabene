import React, { useState } from 'react';

const testimonials = [
    {
        name: 'Mariana Silva',
        role: 'Arquiteta',
        text: 'A Nutrabene mudou completamente a saúde do meu cabelo. Em 3 meses, o volume e o brilho são outros. Minha autoestima agradece!',
        rating: 5,
        avatar: 'https://picsum.photos/100/100?random=21'
    },
    {
        name: 'Carolina Mendes',
        role: 'Chef de Cozinha',
        text: 'As fórmulas são leves e o resultado é incrível. Sinto meu cabelo muito mais forte e resistente. Recomendo para todas!',
        rating: 5,
        avatar: 'https://picsum.photos/100/100?random=22'
    },
    {
        name: 'Beatriz Oliveira',
        role: 'Designer',
        text: 'Amei o conceito de nutrição inteligente. O atendimento do assistente é rápido e as recomendações foram perfeitas para mim.',
        rating: 5,
        avatar: 'https://picsum.photos/100/100?random=23'
    }
];

const beforeAfterImages = [
    {
        id: 1,
        image: '/assets/before_after_1.jpg',
        description: '15 dias usando o tônico capilar'
    },
    {
        id: 2,
        image: '/assets/before_after_2.jpg',
        description: '30 dias usando Tônico capilar Nutrabene'
    },
    {
        id: 3,
        image: '/assets/before_after_3.jpg',
        description: 'Resultado incrível com Tônico Capilar'
    },
    {
        id: 4,
        image: '/assets/before_after_4.jpg',
        description: 'Transformação masculina com Tônico Capilar'
    },
    {
        id: 5,
        image: '/assets/before_after_5.jpg',
        description: 'Resultado incrível - Antes e Depois'
    }
];

const Testimonials: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<number | null>(null);

    return (
        <section className="py-24 px-6 bg-background-soft/30 dark:bg-background-dark/50">
            <div className="max-w-7xl mx-auto">
                {/* Depoimentos Header */}
                <div className="text-center mb-16">
                    <h2 className="text-primary font-black uppercase tracking-[0.25em] text-sm mb-4">Depoimentos</h2>
                    <h3 className="text-4xl md:text-5xl font-extrabold text-dark-text dark:text-white mb-6">Amado por <span className="text-primary">milhares</span>.</h3>
                </div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                    {testimonials.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-white/5 p-10 rounded-[2.5rem] border border-primary/5 shadow-xl shadow-primary/5 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                            {/* Quotation Mark Decor */}
                            <div className="absolute -top-4 -right-4 text-primary/5 group-hover:text-primary/10 transition-colors">
                                <span className="material-symbols-outlined text-[120px] font-black">format_quote</span>
                            </div>

                            <div className="flex text-amber-400 mb-6">
                                {[...Array(item.rating)].map((_, i) => (
                                    <span key={i} className="material-symbols-outlined text-sm icon-filled">star</span>
                                ))}
                            </div>

                            <p className="text-dark-text dark:text-gray-300 font-medium italic mb-10 leading-relaxed relative z-10">
                                "{item.text}"
                            </p>

                            <div className="flex items-center gap-4 border-t border-gray-100 dark:border-white/5 pt-8">
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 p-0.5">
                                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover rounded-full" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-dark-text dark:text-white">{item.name}</h4>
                                    <p className="text-xs text-muted-text dark:text-gray-400 font-bold uppercase tracking-wider">{item.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Before & After Section */}
                <div className="text-center mb-12">
                    <h2 className="text-primary font-black uppercase tracking-[0.25em] text-sm mb-4">Resultados Reais</h2>
                    <h3 className="text-4xl md:text-5xl font-extrabold text-dark-text dark:text-white mb-6">Antes e <span className="text-primary">Depois</span></h3>
                    <p className="text-muted-text max-w-2xl mx-auto text-lg">
                        Veja as transformações incríveis de nossos clientes usando os produtos Porcelain Hair Care.
                    </p>
                </div>

                {/* Before & After Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {beforeAfterImages.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedImage(item.id)}
                            className="group cursor-pointer bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-primary/10 hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl"
                        >
                            <div className="relative aspect-square overflow-hidden">
                                <img
                                    src={item.image}
                                    alt={item.description}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-text/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <span className="text-white font-medium text-sm">{item.description}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lightbox Modal */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button
                            className="absolute top-6 right-6 text-white hover:text-primary transition-colors"
                            onClick={() => setSelectedImage(null)}
                        >
                            <span className="material-symbols-outlined text-4xl">close</span>
                        </button>
                        <img
                            src={beforeAfterImages.find(img => img.id === selectedImage)?.image}
                            alt="Resultado Antes e Depois"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </section>
    );
};

export default Testimonials;

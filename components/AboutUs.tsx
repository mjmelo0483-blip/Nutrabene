
import React from 'react';
import { ASSETS } from '../constants';

const AboutUs: React.FC = () => {
    return (
        <section className="py-20 px-6 bg-white dark:bg-background-dark">
            <div className="max-w-5xl mx-auto">
                {/* Logo centered */}
                <div className="flex justify-center mb-12">
                    <img
                        src={ASSETS.LOGO}
                        alt="Nutrabene"
                        className="h-24 w-auto object-contain"
                    />
                </div>

                {/* Title */}
                <h2 className="text-4xl md:text-5xl font-logo text-dark-text dark:text-white mb-10 text-center md:text-left">
                    Quem Somos
                </h2>

                {/* Content */}
                <div className="space-y-6 text-dark-text dark:text-gray-300 leading-relaxed text-lg">
                    <p>
                        Prazer, sou a <strong className="text-primary-dark">Polyana Gomes</strong>, embaixadora da marca vou contar como nasceu a empresa há 30 anos atrás minha mãe, <strong className="text-primary-dark">Neuza Gomes</strong>, criou um tratamento capilar pensando em um cuidado o nome dele era "Porcelana" feito em casa para os cabelos. A ideia era jogar <span className="underline decoration-primary">uma bomba de vitaminas no cabelo</span> e fazer com que ele ficasse nutrido por um longo tempo, ela mesma usava 2 vezes ao ano apenas.
                    </p>

                    <p>
                        Para reviver e reinventar esse conceito, trazer a memória da minha mãe comigo, sua paixão pela beleza junto a minha e com isso criar a mais nova linha de beleza do mercado nasceu a <strong className="text-primary-dark">Nutrabene Porcelain Hair Care</strong> uma <span className="underline decoration-primary">linha de cuidados veganos</span>, com ativos naturais pensado especialmente no cuidado diário e tratamentos de reconstrução e nutrição.
                    </p>
                </div>

                {/* Decorative divider */}
                <div className="flex items-center justify-center mt-12">
                    <div className="h-px w-20 bg-primary/30"></div>
                    <span className="material-symbols-outlined text-primary mx-4">eco</span>
                    <div className="h-px w-20 bg-primary/30"></div>
                </div>
            </div>
        </section>
    );
};

export default AboutUs;

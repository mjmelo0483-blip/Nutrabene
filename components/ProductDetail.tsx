
import React from 'react';
import { Product } from '../types';

interface ProductDetailProps {
    product: Product;
    onBack: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack }) => {
    return (
        <section className="min-h-screen py-8 px-6 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-primary hover:text-primary-dark mb-8 font-medium transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Voltar aos Produtos
                </button>

                <div className="bg-white dark:bg-white/5 rounded-3xl overflow-hidden shadow-2xl border border-primary/10">
                    <div className="flex flex-col lg:flex-row">
                        {/* Left: Product Image */}
                        <div className="lg:w-1/2 bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] dark:from-primary/20 dark:to-primary/10 p-8 lg:p-12 flex items-center justify-center">
                            <img
                                src={product.detailImageUrl || product.imageUrl}
                                alt={product.name}
                                className="max-w-full max-h-[500px] object-contain rounded-2xl shadow-lg"
                            />
                        </div>

                        {/* Right: Product Info */}
                        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col">
                            {/* Header */}
                            <div className="mb-6">
                                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-2">PORCELAIN HAIR CARE</p>
                                <h1 className="text-3xl lg:text-4xl font-extrabold text-dark-text dark:text-white mb-2">
                                    {product.name}
                                </h1>
                                {product.volume && (
                                    <p className="text-muted-text text-lg">{product.volume}</p>
                                )}
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-white/10">
                                {product.originalPrice && (
                                    <span className="text-muted-text line-through text-lg">
                                        R${product.originalPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                )}
                                <span className="text-primary font-extrabold text-3xl">
                                    R${product.price.toFixed(2).replace('.', ',')}
                                </span>
                                {product.tags.includes('5% OFF') && (
                                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                                        5% OFF
                                    </span>
                                )}
                            </div>

                            {/* Presentation */}
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-dark-text dark:text-white mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">description</span>
                                    APRESENTAÇÃO
                                </h2>
                                <p className="text-muted-text dark:text-gray-400 leading-relaxed">
                                    {product.fullDescription || product.description}
                                </p>
                            </div>

                            {/* Ingredients */}
                            {product.ingredients && product.ingredients.length > 0 && (
                                <div className="mb-6">
                                    <h2 className="text-lg font-bold text-dark-text dark:text-white mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">eco</span>
                                        CONTÉM
                                    </h2>
                                    <ul className="space-y-3">
                                        {product.ingredients.map((ingredient, index) => (
                                            <li key={index} className="text-sm text-muted-text dark:text-gray-400">
                                                <span className="font-bold text-dark-text dark:text-white">• {ingredient.name}:</span>{' '}
                                                {ingredient.description}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Usage */}
                            {product.usage && (
                                <div className="mb-8">
                                    <h2 className="text-lg font-bold text-dark-text dark:text-white mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                                        UTILIZAÇÃO
                                    </h2>
                                    <p className="text-muted-text dark:text-gray-400 leading-relaxed">
                                        {product.usage}
                                    </p>
                                </div>
                            )}

                            {/* CTA Button */}
                            <div className="mt-auto">
                                <button className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-lg">
                                    <span className="material-symbols-outlined">shopping_cart</span>
                                    Adicionar ao Carrinho
                                </button>
                                <p className="text-center text-xs text-muted-text mt-3">
                                    {product.originalPrice && `3x de R$${(product.price / 3).toFixed(2).replace('.', ',')} sem juros`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductDetail;

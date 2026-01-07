
import React, { useState, useMemo } from 'react';
import { PRODUCTS } from '../constants';
import { Product } from '../types';

interface ProductShowcaseProps {
  onProductSelect?: (product: Product) => void;
}

const ProductShowcase: React.FC<ProductShowcaseProps> = ({ onProductSelect }) => {
  const [filter, setFilter] = useState<string>('Todos');

  const filteredProducts = useMemo(() => {
    if (filter === 'Todos') return PRODUCTS;
    return PRODUCTS.filter(p => p.category === filter);
  }, [filter]);

  const categories = ['Todos', 'Tratamento', 'Limpeza', 'Hidratação'];

  return (
    <section className="py-16 px-6 bg-white dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-dark-text dark:text-white mb-4">Nutrabene Hair Care</h2>
          <p className="text-muted-text max-w-2xl mx-auto text-lg">
            Redescubra a vitalidade dos seus fios com nossa linha exclusiva de tratamento capilar natural.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${filter === cat
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white dark:bg-white/5 text-dark-text dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-primary'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onSelect={onProductSelect} />
          ))}
        </div>
      </div>
    </section>
  );
};

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => (
  <div className="group bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-primary/5 hover:border-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col h-full">
    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-white/10">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      />
      {product.tags.includes('5% OFF') && (
        <span className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          5% OFF
        </span>
      )}
    </div>

    <div className="p-6 flex flex-col flex-1">
      <div className="flex flex-col mb-3">
        <h3 className="text-lg font-bold text-dark-text dark:text-white mb-2">{product.name}</h3>
        <div className="flex items-center gap-2">
          {product.originalPrice && (
            <span className="text-muted-text line-through text-sm">R${product.originalPrice.toFixed(2).replace('.', ',')}</span>
          )}
          <span className="text-primary font-bold text-lg">R${product.price.toFixed(2).replace('.', ',')}</span>
        </div>
        {product.originalPrice && (
          <span className="text-xs text-muted-text mt-1">3x de R${(product.price / 3).toFixed(2).replace('.', ',')} sem juros</span>
        )}
      </div>

      <p className="text-muted-text dark:text-gray-400 text-sm mb-6 line-clamp-2">
        {product.description}
      </p>

      <div className="mt-auto">
        <div className="flex gap-2 mb-4">
          {product.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-primary/10 text-primary-dark text-[10px] font-bold">
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={() => onSelect?.(product)}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-soft active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">visibility</span>
          Conheça o Produto
        </button>
      </div>
    </div>
  </div>
);

export default ProductShowcase;

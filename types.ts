
export type Section = 'home' | 'products' | 'register' | 'assistant' | 'about' | 'privacy';

export interface ProductIngredient {
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  fullDescription?: string;
  category: 'Crescimento' | 'Reconstrução' | 'Hidratação' | 'Tratamento' | 'Limpeza';
  tags: string[];
  imageUrl: string;
  detailImageUrl?: string;
  featured?: boolean;
  volume?: string;
  ingredients?: ProductIngredient[];
  usage?: string;
}

export interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
}

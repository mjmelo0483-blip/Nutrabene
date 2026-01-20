import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface Registration {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    birth_date: string;
    sleep_schedule: string;
    purchase_location: string;
    establishment_name?: string;
    created_at: string;
}

interface ReminderSettings {
    message_template: string;
    media_url?: string;
}

interface ProductInventory {
    id: string;
    name: string;
    stock_quantity: number;
    price: number;
    cost_price: number;
}

const AdminDashboard: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [settings, setSettings] = useState<ReminderSettings>({ message_template: '' });
    const [products, setProducts] = useState<ProductInventory[]>([]);
    const [uploading, setUploading] = useState(false);
    const [updatingStock, setUpdatingStock] = useState<string | null>(null);
    const [dataError, setDataError] = useState('');

    // Modal State for CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<Registration> | null>(null);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<ProductInventory> | null>(null);

    // Check current session
    useEffect(() => {
        checkUser();
    }, []);

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { data: admin } = await supabase
                .from('admins')
                .select('email')
                .eq('email', session.user.email)
                .single();

            if (admin) {
                setIsAdmin(true);
                fetchData();
            } else {
                await supabase.auth.signOut();
                setAuthError('Acesso restrito. E-mail não autorizado.');
            }
        }
        setLoading(false);
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setAuthError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setAuthError(error.message);
        } else {
            checkUser();
        }
    }

    async function fetchData() {
        setDataError('');
        const { data: regs, error: regError } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
        const { data: sett, error: settError } = await supabase.from('reminder_settings').select('message_template, media_url').eq('key', 'default').single();
        const { data: prods, error: prodError } = await supabase.from('products').select('*').order('name');

        if (regError) setDataError(`Erro ao carregar clientes: ${regError.message}`);
        if (settError) setDataError(prev => prev ? `${prev} | ${settError.message}` : `Erro ao carregar configurações: ${settError.message}`);
        if (prodError) setDataError(prev => prev ? `${prev} | ${prodError.message}` : `Erro ao carregar estoque: ${prodError.message}`);

        if (regs) setRegistrations(regs);
        if (sett) setSettings(sett);
        if (prods) setProducts(prods);
    }

    // --- CRUD Operations ---
    async function handleSaveClient(e: React.FormEvent) {
        e.preventDefault();
        if (!editingClient) return;

        const clientData = {
            ...editingClient,
            whatsapp: editingClient.whatsapp?.replace(/\D/g, ''), // Clean mask
        };

        let error;
        if (clientData.id) {
            // Update - remove system fields that shouldn't be edited/restored
            const { id, created_at, last_reminder_sent_at, ...updateData } = clientData;
            const { error: updError } = await supabase.from('registrations').update(updateData).eq('id', id);
            error = updError;
        } else {
            // Create
            const { error: insError } = await supabase.from('registrations').insert([clientData]);
            error = insError;
        }

        if (error) {
            alert(`Erro ao salvar: ${error.message}`);
        } else {
            setIsModalOpen(false);
            setEditingClient(null);
            fetchData();
            alert('Informações salvas com sucesso!');
        }
    }

    async function handleDeleteClient(id: string) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        const { error } = await supabase.from('registrations').delete().eq('id', id);
        if (error) {
            alert(`Erro ao excluir: ${error.message}`);
        } else {
            fetchData();
        }
    }

    // --- Stock Operations ---
    async function handleUpdateStock(id: string, newQuantity: number) {
        if (newQuantity < 0) return;
        setUpdatingStock(id);
        const { error } = await supabase
            .from('products')
            .update({ stock_quantity: newQuantity })
            .eq('id', id);

        if (error) {
            alert(`Erro ao atualizar estoque: ${error.message}`);
        } else {
            setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p));
        }
        setUpdatingStock(null);
    }

    async function handleSaveProduct(e: React.FormEvent) {
        e.preventDefault();
        if (!editingProduct) return;

        let error;
        if (editingProduct.id && products.find(p => p.id === editingProduct.id)) {
            // Update
            const { id, ...updateData } = editingProduct;
            const { error: updError } = await supabase.from('products').update(updateData).eq('id', id);
            error = updError;
        } else {
            // Create
            const { error: insError } = await supabase.from('products').insert([editingProduct]);
            error = insError;
        }

        if (error) {
            alert(`Erro ao salvar produto: ${error.message}`);
        } else {
            setIsProductModalOpen(false);
            setEditingProduct(null);
            fetchData();
            alert('Produto salvo com sucesso!');
        }
    }

    async function handleDeleteProduct(id: string) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert(`Erro ao excluir produto: ${error.message}`);
        } else {
            fetchData();
        }
    }

    // --- Messaging Settings ---
    async function updateMessage() {
        const { error } = await supabase.from('reminder_settings').update({ message_template: settings.message_template }).eq('key', 'default');
        if (error) alert(error.message);
        else alert('Mensagem atualizada!');
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `reminders/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('admin-media').upload(filePath, file);

        if (uploadError) {
            alert(uploadError.message);
        } else {
            const { data: { publicUrl } } = supabase.storage.from('admin-media').getPublicUrl(filePath);
            await supabase.from('reminder_settings').update({ media_url: publicUrl, media_type: file.type.startsWith('image') ? 'image' : 'file' }).eq('key', 'default');
            setSettings({ ...settings, media_url: publicUrl });
            alert('Arquivo enviado e vinculado!');
        }
        setUploading(false);
    }

    if (loading) return <div className="p-20 text-center">Carregando...</div>;

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10">
                    <h2 className="text-3xl font-bold text-center mb-8">Acesso Administrativo</h2>
                    {authError && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{authError}</div>}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2">E-mail</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 border rounded-xl" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Senha</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 border rounded-xl" required />
                        </div>
                        <button className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-4xl font-extrabold">Painel Administrativo</h1>
                <button onClick={() => { supabase.auth.signOut(); setIsAdmin(false); }} className="text-red-500 font-semibold">Sair</button>
            </div>

            {dataError && <div className="bg-amber-50 text-amber-600 p-4 rounded-xl mb-8 text-sm border border-amber-200">{dataError}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Settings Column */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white rounded-3xl shadow-sm border p-8">
                        <h2 className="text-xl font-bold mb-6">Configuração da Mensagem</h2>
                        <p className="text-xs text-muted-text mb-4">Dica: Use <b>{'{nome}'}</b> para personalizar.</p>
                        <textarea
                            value={settings.message_template}
                            onChange={e => setSettings({ ...settings, message_template: e.target.value })}
                            className="w-full p-4 border rounded-xl h-32 mb-4"
                            placeholder="Escreva a mensagem aqui..."
                        />
                        <button onClick={updateMessage} className="w-full bg-primary text-white py-3 rounded-xl font-bold mb-6">Salvar Texto</button>

                        <hr className="my-6" />

                        <h3 className="font-bold mb-4">Imagem/Arquivo do Lembrete</h3>
                        {settings.media_url && (
                            <div className="mb-4">
                                <img src={settings.media_url} alt="Preview" className="w-full h-48 object-cover rounded-xl border" />
                            </div>
                        )}
                        <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" disabled={uploading} />
                        <label htmlFor="file-upload" className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary transition-colors">
                            <span className="material-symbols-outlined mr-2">upload_file</span>
                            {uploading ? 'Enviando...' : 'Trocar Imagem/Arquivo'}
                        </label>
                    </div>
                </div>

                {/* Clients Column */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                        <div className="p-8 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold">Clientes Cadastrados ({registrations.length})</h2>
                            <button
                                onClick={() => { setEditingClient({ purchase_location: 'site_oficial' }); setIsModalOpen(true); }}
                                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center"
                            >
                                <span className="material-symbols-outlined text-sm mr-1">person_add</span> Incluir Cliente
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Nome</th>
                                        <th className="px-6 py-4">WhatsApp</th>
                                        <th className="px-6 py-4">Sono</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {registrations.map(reg => (
                                        <tr key={reg.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{reg.name}</div>
                                                <div className="text-gray-500 text-xs">{reg.email}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium">{reg.whatsapp}</td>
                                            <td className="px-6 py-4 font-bold text-primary">{reg.sleep_schedule}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => { setEditingClient(reg); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteClient(reg.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Stock Control Row - Full Width */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Itens em Estoque</p>
                            <p className="text-3xl font-black text-gray-800">{products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Valor Total (Custo)</p>
                            <p className="text-3xl font-black text-blue-600">
                                R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Valor Total (Venda)</p>
                            <p className="text-3xl font-black text-green-600">
                                R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                        <div className="p-8 border-b flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Controle de Estoque</h2>
                                <p className="text-sm text-gray-500">Gerencie preços e quantidades</p>
                            </div>
                            <button
                                onClick={() => { setEditingProduct({ stock_quantity: 0, price: 0, cost_price: 0 }); setIsProductModalOpen(true); }}
                                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center"
                            >
                                <span className="material-symbols-outlined text-sm mr-1">add_box</span> Novo Produto
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Produto</th>
                                        <th className="px-6 py-4">Preço Custo</th>
                                        <th className="px-6 py-4">Preço Venda</th>
                                        <th className="px-6 py-4 text-center">Estoque</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {products.map(prod => (
                                        <tr key={prod.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{prod.name}</div>
                                                <div className="text-gray-500 text-xs">ID: {prod.id}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-500 text-xs uppercase">
                                                <span className="block text-[10px] font-bold text-gray-400 mb-1">Custo</span>
                                                R$ {Number(prod.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-green-600">
                                                <span className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Venda</span>
                                                R$ {Number(prod.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center space-x-3">
                                                    <button
                                                        onClick={() => handleUpdateStock(prod.id, prod.stock_quantity - 1)}
                                                        disabled={updatingStock === prod.id || prod.stock_quantity <= 0}
                                                        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">remove_circle_outline</span>
                                                    </button>
                                                    <span className={`text-sm font-bold w-8 text-center ${prod.stock_quantity <= 5 ? 'text-red-500' : 'text-gray-800'}`}>
                                                        {prod.stock_quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleUpdateStock(prod.id, prod.stock_quantity + 1)}
                                                        disabled={updatingStock === prod.id}
                                                        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">add_circle_outline</span>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {prod.stock_quantity === 0 ? (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase">Esgotado</span>
                                                ) : prod.stock_quantity <= 5 ? (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold uppercase">Baixo</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[10px] font-bold uppercase">OK</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => { setEditingProduct(prod); setIsProductModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product CRUD Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">{editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}</h2>
                        <form onSubmit={handleSaveProduct} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ID / Slug do Produto</label>
                                    <input
                                        type="text"
                                        value={editingProduct?.id || ''}
                                        onChange={e => setEditingProduct({ ...editingProduct, id: e.target.value })}
                                        className="w-full p-3 border rounded-xl"
                                        placeholder="ex: kit-completo"
                                        disabled={!!products.find(p => p.id === editingProduct?.id)}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Nome do Produto</label>
                                    <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Preço de Custo (R$)</label>
                                    <input type="number" step="0.01" value={editingProduct?.cost_price || 0} onChange={e => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Preço de Venda (R$)</label>
                                    <input type="number" step="0.01" value={editingProduct?.price || 0} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Quantidade Inicial</label>
                                    <input type="number" value={editingProduct?.stock_quantity || 0} onChange={e => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) })} className="w-full p-3 border rounded-xl" required />
                                </div>
                            </div>

                            <div className="flex space-x-4 mt-8">
                                <button type="button" onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} className="flex-1 py-4 border rounded-xl font-bold text-gray-500">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Salvar Produto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

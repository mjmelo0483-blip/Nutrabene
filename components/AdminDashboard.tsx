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

interface Reseller {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    commission_rate: number;
}

interface BankAccount {
    id: string;
    name: string;
    balance: number;
}

interface FinancialEntry {
    id: string;
    type: 'receivable' | 'payable';
    description: string;
    amount: number;
    due_date: string;
    payment_date?: string;
    status: 'pending' | 'paid' | 'overdue';
    category: string;
    bank_account_id?: string;
    reseller_id?: string;
}

interface Sale {
    id: string;
    product_id: string;
    reseller_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    sale_date: string;
    payment_status: string;
}

const AdminDashboard: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'inventory' | 'sales' | 'resellers' | 'finances' | 'settings'>('dashboard');
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [settings, setSettings] = useState<ReminderSettings>({ message_template: '' });
    const [products, setProducts] = useState<ProductInventory[]>([]);
    const [resellers, setResellers] = useState<Reseller[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);

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
        try {
            const [
                { data: regs },
                { data: sett },
                { data: prods },
                { data: resel },
                { data: banks },
                { data: fin },
                { data: sls }
            ] = await Promise.all([
                supabase.from('registrations').select('*').order('created_at', { ascending: false }),
                supabase.from('reminder_settings').select('message_template, media_url').eq('key', 'default').single(),
                supabase.from('products').select('*').order('name'),
                supabase.from('resellers').select('*').order('name'),
                supabase.from('bank_accounts').select('*').order('name'),
                supabase.from('financial_entries').select('*').order('due_date', { ascending: true }),
                supabase.from('sales').select('*').order('sale_date', { ascending: false })
            ]);

            if (regs) setRegistrations(regs);
            if (sett) setSettings(sett);
            if (prods) setProducts(prods);
            if (resel) setResellers(resel);
            if (banks) setBankAccounts(banks);
            if (fin) setFinancialEntries(fin);
            if (sls) setSales(sls);
        } catch (err) {
            console.error(err);
            setDataError('Erro ao sincronizar dados com o servidor.');
        }
    }

    // --- Client Handlers ---
    async function handleSaveClient(e: React.FormEvent) {
        e.preventDefault();
        if (!editingClient) return;

        const clientData = {
            ...editingClient,
            whatsapp: editingClient.whatsapp?.replace(/\D/g, ''),
        };

        let error;
        if (clientData.id) {
            const { id, created_at, ...updateData } = clientData as any;
            const { error: updError } = await supabase.from('registrations').update(updateData).eq('id', id);
            error = updError;
        } else {
            const { error: insError } = await supabase.from('registrations').insert([clientData]);
            error = insError;
        }

        if (error) alert(`Erro: ${error.message}`);
        else { setIsModalOpen(false); setEditingClient(null); fetchData(); }
    }

    async function handleDeleteClient(id: string) {
        if (!confirm('Excluir cliente?')) return;
        const { error } = await supabase.from('registrations').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    }

    // --- Product/Stock Handlers ---
    async function handleUpdateStock(id: string, newQuantity: number) {
        if (newQuantity < 0) return;
        setUpdatingStock(id);
        const { error } = await supabase.from('products').update({ stock_quantity: newQuantity }).eq('id', id);
        if (error) alert(error.message);
        else setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p));
        setUpdatingStock(null);
    }

    async function handleSaveProduct(e: React.FormEvent) {
        e.preventDefault();
        if (!editingProduct) return;
        let error;
        if (editingProduct.id && products.find(p => p.id === editingProduct.id)) {
            const { id, ...updateData } = editingProduct;
            const { error: updError } = await supabase.from('products').update(updateData).eq('id', id);
            error = updError;
        } else {
            const { error: insError } = await supabase.from('products').insert([editingProduct]);
            error = insError;
        }
        if (error) alert(error.message);
        else { setIsProductModalOpen(false); setEditingProduct(null); fetchData(); }
    }

    async function handleDeleteProduct(id: string) {
        if (!confirm('Excluir produto?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    }

    // --- Reseller Handlers ---
    async function handleSaveReseller(e: React.FormEvent, resellerData: any) {
        e.preventDefault();
        let error;
        if (resellerData.id) {
            const { id, ...updateData } = resellerData;
            const { error: updError } = await supabase.from('resellers').update(updateData).eq('id', id);
            error = updError;
        } else {
            const { error: insError } = await supabase.from('resellers').insert([resellerData]);
            error = insError;
        }
        if (error) alert(error.message);
        else fetchData();
    }

    async function handleDeleteReseller(id: string) {
        if (!confirm('Excluir revendedor?')) return;
        const { error } = await supabase.from('resellers').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    }

    // --- Sale Handlers ---
    async function handleRegisterSale(saleData: any) {
        // 1. Check stock
        const product = products.find(p => p.id === saleData.product_id);
        if (!product || product.stock_quantity < saleData.quantity) {
            alert('Estoque insuficiente para esta venda!');
            return;
        }

        // 2. Insert sale
        const { data: sale, error: saleError } = await supabase.from('sales').insert([saleData]).select().single();
        if (saleError) { alert(saleError.message); return; }

        // 3. Update stock
        await handleUpdateStock(saleData.product_id, product.stock_quantity - saleData.quantity);

        // 4. Create financial entry (Receivable)
        await supabase.from('financial_entries').insert([{
            type: 'receivable',
            description: `Venda #${sale.id.slice(0, 8)} - ${product.name}`,
            amount: saleData.total_price,
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            category: 'Venda de Produto',
            sale_id: sale.id,
            reseller_id: saleData.reseller_id
        }]);

        alert('Venda registrada com sucesso!');
        fetchData();
    }

    // --- Financial Handlers ---
    async function handleSaveFinancialEntry(e: React.FormEvent, entryData: any) {
        e.preventDefault();
        let error;
        if (entryData.id) {
            const { id, ...updateData } = entryData;
            const { error: updError } = await supabase.from('financial_entries').update(updateData).eq('id', id);
            error = updError;
        } else {
            const { error: insError } = await supabase.from('financial_entries').insert([entryData]);
            error = insError;
        }
        if (error) alert(error.message);
        else fetchData();
    }

    async function handleMarkAsPaid(entry: FinancialEntry) {
        if (entry.status === 'paid') return;

        const bankId = entry.bank_account_id || bankAccounts[0]?.id;
        if (!bankId) { alert('Selecione uma conta bancária!'); return; }

        const bank = bankAccounts.find(b => b.id === bankId);
        if (!bank) return;

        // Calculate new balance
        const newBalance = entry.type === 'receivable' ? bank.balance + entry.amount : bank.balance - entry.amount;

        // 1. Update bank balance
        const { error: bankError } = await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', bankId);
        if (bankError) { alert(bankError.message); return; }

        // 2. Update entry status
        const { error: entryError } = await supabase.from('financial_entries').update({
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0],
            bank_account_id: bankId
        }).eq('id', entry.id);

        if (entryError) alert(entryError.message);
        else fetchData();
    }

    // --- Asset Helpers ---
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `reminder-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('reminder-assets').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('reminder-assets').getPublicUrl(fileName);
            const { error: updateError } = await supabase.from('reminder_settings').update({ media_url: publicUrl }).eq('key', 'default');
            if (updateError) throw updateError;
            setSettings({ ...settings, media_url: publicUrl });
            alert('Arquivo atualizado!');
        } catch (error: any) {
            alert(error.message);
        } finally { setUploading(false); }
    }

    async function updateMessage() {
        const { error } = await supabase.from('reminder_settings').update({ message_template: settings.message_template }).eq('key', 'default');
        if (error) alert(error.message);
        else alert('Mensagem atualizada!');
    }

    // --- UI Helpers ---
    const getTabIcon = (tab: string) => {
        switch (tab) {
            case 'dashboard': return 'dashboard';
            case 'clients': return 'group';
            case 'inventory': return 'inventory_2';
            case 'sales': return 'shopping_cart';
            case 'resellers': return 'handshake';
            case 'finances': return 'payments';
            case 'settings': return 'settings';
            default: return 'circle';
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-primary">Carregando painel...</div>;

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="bg-white w-full max-w-md rounded-3xl p-10 shadow-xl border border-gray-100">
                    <img src="/logo.png" alt="Nutrabene" className="h-12 mx-auto mb-8" />
                    <h1 className="text-2xl font-black text-center mb-8">Gestão Administrativa</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-4 border rounded-2xl bg-gray-50 focus:ring-2 ring-primary/20 outline-none" required />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full p-4 border rounded-2xl bg-gray-50 focus:ring-2 ring-primary/20 outline-none" required />
                        {authError && <p className="text-red-500 text-xs font-bold px-2">{authError}</p>}
                        <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r flex flex-col fixed inset-y-0 left-0 z-20">
                <div className="p-8">
                    <img src="/logo.png" alt="Nutrabene" className="h-10 mb-8" />
                    <nav className="space-y-1">
                        {['dashboard', 'clients', 'inventory', 'sales', 'resellers', 'finances', 'settings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`w-full flex items-center px-4 py-4 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined mr-3">{getTabIcon(tab)}</span>
                                <span className="capitalize">{tab === 'clients' ? 'Clientes' : tab === 'inventory' ? 'Estoque' : tab === 'sales' ? 'Vendas' : tab === 'resellers' ? 'Revendedores' : tab === 'finances' ? 'Financeiro' : tab === 'settings' ? 'Configurações' : 'Dashboard'}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto p-8 border-t">
                    <button onClick={() => { supabase.auth.signOut(); setIsAdmin(false); }} className="flex items-center text-red-500 font-bold text-sm hover:opacity-80">
                        <span className="material-symbols-outlined mr-3">logout</span> Sair do Sistema
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 p-12">
                <header className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 capitalize">
                            {activeTab === 'dashboard' ? 'Visão Geral' :
                                activeTab === 'clients' ? 'Clientes' :
                                    activeTab === 'inventory' ? 'Controle de Estoque' :
                                        activeTab === 'sales' ? 'Vendas Realizadas' :
                                            activeTab === 'resellers' ? 'Revendedores' :
                                                activeTab === 'finances' ? 'Controle Financeiro' : 'Configurações'}
                        </h1>
                        <p className="text-gray-500 mt-1">Gestão inteligente Nutrabene.</p>
                    </div>
                </header>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Receita Total</p>
                                <p className="text-2xl font-black text-gray-800">R$ {sales.reduce((acc, s) => acc + s.total_price, 0).toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">trending_up</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Vendas</p>
                                <p className="text-2xl font-black text-gray-800">{sales.length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">inventory_2</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Abaixo do Estoque</p>
                                <p className="text-2xl font-black text-gray-800">{products.filter(p => p.stock_quantity <= 5).length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">group</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Clientes</p>
                                <p className="text-2xl font-black text-gray-800">{registrations.length}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-3xl border shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center">
                                    <span className="material-symbols-outlined mr-2 text-primary">account_balance</span>
                                    Finanças Pendentes
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-5 bg-green-50 rounded-2xl border border-green-100">
                                        <div className="flex items-center text-green-800">
                                            <span className="material-symbols-outlined mr-3">arrow_downward</span>
                                            <span className="font-bold">Total a Receber</span>
                                        </div>
                                        <span className="font-black text-green-600 text-lg">
                                            R$ {financialEntries.filter(e => e.type === 'receivable' && e.status !== 'paid').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-5 bg-red-50 rounded-2xl border border-red-100">
                                        <div className="flex items-center text-red-800">
                                            <span className="material-symbols-outlined mr-3">arrow_upward</span>
                                            <span className="font-bold">Total a Pagar</span>
                                        </div>
                                        <span className="font-black text-red-600 text-lg">
                                            R$ {financialEntries.filter(e => e.type === 'payable' && e.status !== 'paid').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 flex flex-col justify-center items-center text-center">
                                <p className="text-sm font-bold text-primary/60 uppercase tracking-widest mb-2">Disponível em Bancos</p>
                                <p className="text-5xl font-black text-primary">
                                    R$ {bankAccounts.reduce((acc, b) => acc + b.balance, 0).toLocaleString('pt-BR')}
                                </p>
                                <div className="mt-6 flex space-x-2">
                                    {bankAccounts.map(b => (
                                        <div key={b.id} className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 border">
                                            {b.name}: R$ {b.balance.toLocaleString('pt-BR')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clients Tab */}
                {activeTab === 'clients' && (
                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-8 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold">Base de Dados de Clientes</h2>
                            <button
                                onClick={() => { setEditingClient({ purchase_location: 'site_oficial' }); setIsModalOpen(true); }}
                                className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                <span className="material-symbols-outlined mr-2">person_add</span> Novo Cliente
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5 text-center w-20">#</th>
                                        <th className="px-8 py-5">Cliente</th>
                                        <th className="px-8 py-5">Contato</th>
                                        <th className="px-8 py-5">Status VIP</th>
                                        <th className="px-8 py-5 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {registrations.map((reg, idx) => (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-5 text-center text-gray-300 font-bold">{idx + 1}</td>
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-gray-800">{reg.name}</div>
                                                <div className="text-gray-400 text-xs">{reg.email}</div>
                                            </td>
                                            <td className="px-8 py-5 font-medium text-gray-600">{reg.whatsapp}</td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">{reg.purchase_location}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => { setEditingClient(reg); setIsModalOpen(true); }} className="h-10 w-10 text-blue-600 hover:bg-blue-50 rounded-xl flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-xl">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteClient(reg.id)} className="h-10 w-10 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-xl">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-3xl border shadow-sm text-center">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Itens Estocados</p>
                                <p className="text-4xl font-black text-gray-800">{products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border shadow-sm text-center">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Valor de Custo</p>
                                <p className="text-4xl font-black text-blue-600">R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0).toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border shadow-sm text-center">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Valor Mercado</p>
                                <p className="text-4xl font-black text-green-600">R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center">
                                <h2 className="text-xl font-bold">Catálogo de Produtos</h2>
                                <button
                                    onClick={() => { setEditingProduct({ stock_quantity: 0, price: 0, cost_price: 0 }); setIsProductModalOpen(true); }}
                                    className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                >
                                    <span className="material-symbols-outlined mr-2">add_box</span> Novo Produto
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-8 py-5">Produto</th>
                                            <th className="px-8 py-5">Valores</th>
                                            <th className="px-8 py-5 text-center">Estoque</th>
                                            <th className="px-8 py-5 text-center">Status</th>
                                            <th className="px-8 py-5 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm text-gray-600">
                                        {products.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-gray-800">{p.name}</div>
                                                    <div className="text-[10px] text-gray-300 font-mono">{p.id}</div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex space-x-6">
                                                        <div>
                                                            <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Custo</span>
                                                            <span className="font-medium text-gray-500">R$ {p.cost_price.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Venda</span>
                                                            <span className="font-black text-green-600">R$ {p.price.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-center space-x-4">
                                                        <button onClick={() => handleUpdateStock(p.id, p.stock_quantity - 1)} disabled={updatingStock === p.id} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                                            <span className="material-symbols-outlined text-sm font-bold">remove</span>
                                                        </button>
                                                        <span className={`text-lg font-black w-8 text-center ${p.stock_quantity <= 5 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock_quantity}</span>
                                                        <button onClick={() => handleUpdateStock(p.id, p.stock_quantity + 1)} disabled={updatingStock === p.id} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-green-50 hover:text-green-500 transition-all shadow-sm">
                                                            <span className="material-symbols-outlined text-sm font-bold">add</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    {p.stock_quantity === 0 ? <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black">OUT OF STOCK</span> :
                                                        p.stock_quantity <= 5 ? <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black">LOW STOCK</span> :
                                                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">VERIFIED</span>}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex justify-center space-x-2">
                                                        <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="h-10 w-10 text-blue-600 hover:bg-blue-50 rounded-xl flex items-center justify-center transition-colors">
                                                            <span className="material-symbols-outlined">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteProduct(p.id)} className="h-10 w-10 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors">
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
                )}

                {/* Sales Tab */}
                {activeTab === 'sales' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white p-8 rounded-3xl border shadow-sm flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Registro de Vendas</h2>
                                <p className="text-sm text-gray-400">Lance novas vendas e gerencie o histórico.</p>
                            </div>
                            <button
                                onClick={() => {
                                    const prodId = products[0]?.id;
                                    const price = products[0]?.price || 0;
                                    const qty = 1;
                                    handleRegisterSale({
                                        product_id: prodId,
                                        quantity: qty,
                                        unit_price: price,
                                        total_price: price * qty,
                                        payment_status: 'pending'
                                    });
                                }}
                                className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center"
                            >
                                <span className="material-symbols-outlined mr-2">add_shopping_cart</span> Nova Venda Rápida
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {sales.length === 0 ? (
                                <div className="bg-gray-50 border-2 border-dashed rounded-3xl p-20 text-center text-gray-400">
                                    Nenhuma venda registrada ainda.
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-8 py-5">Data</th>
                                                <th className="px-8 py-5">Produto</th>
                                                <th className="px-8 py-5 text-center">Quant.</th>
                                                <th className="px-8 py-5">Total</th>
                                                <th className="px-8 py-5">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-sm">
                                            {sales.map(s => (
                                                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-8 py-5 text-gray-500 font-medium">{new Date(s.sale_date).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-8 py-5 font-bold text-gray-800">{products.find(p => p.id === s.product_id)?.name || 'Produto Excluído'}</td>
                                                    <td className="px-8 py-5 text-center font-bold">{s.quantity}</td>
                                                    <td className="px-8 py-5 font-black text-primary">R$ {s.total_price.toLocaleString('pt-BR')}</td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {s.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Resellers Tab */}
                {activeTab === 'resellers' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white p-8 rounded-3xl border shadow-sm flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Rede de Revendedores</h2>
                                <p className="text-sm text-gray-400">Gerencie parcerias e comissões.</p>
                            </div>
                            <button
                                onClick={() => {
                                    const name = prompt('Nome do Revendedor:');
                                    if (name) handleSaveReseller({ preventDefault: () => { } } as any, { name, commission_rate: 20 });
                                }}
                                className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center"
                            >
                                <span className="material-symbols-outlined mr-2">person_add</span> Novo Parceiro
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {resellers.map(r => (
                                <div key={r.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black">
                                            {r.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleDeleteReseller(r.id)} className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined">delete</span></button>
                                        </div>
                                    </div>
                                    <h3 className="font-black text-gray-800 text-lg">{r.name}</h3>
                                    <p className="text-xs text-gray-400 mb-4">{r.whatsapp || 'Sem contato'}</p>
                                    <div className="flex justify-between items-center pt-4 border-t">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Comissão</span>
                                        <span className="font-black text-primary">{r.commission_rate}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Finance Tab */}
                {activeTab === 'finances' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {bankAccounts.map(bank => (
                                <div key={bank.id} className="bg-white p-8 rounded-3xl border shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-4xl">account_balance</span>
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{bank.name}</p>
                                    <p className="text-3xl font-black text-gray-800">R$ {bank.balance.toLocaleString('pt-BR')}</p>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const desc = prompt('Descrição do lançamento:');
                                    const val = prompt('Valor (ex: 150.00):');
                                    const type = confirm('É uma RECEITA? (OK para sim, Cancel para DESPESA)') ? 'receivable' : 'payable';
                                    if (desc && val) handleSaveFinancialEntry({ preventDefault: () => { } } as any, {
                                        type,
                                        description: desc,
                                        amount: parseFloat(val.replace(',', '.')),
                                        due_date: new Date().toISOString().split('T')[0],
                                        status: 'pending',
                                        category: 'Manual'
                                    });
                                }}
                                className="bg-primary/5 text-primary p-8 rounded-3xl border border-primary/20 font-black flex items-center justify-center hover:bg-primary hover:text-white transition-all group shadow-sm"
                            >
                                <span className="material-symbols-outlined mr-2 group-hover:rotate-90 transition-transform">add_circle</span> Novo Lançamento Manual
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center">
                                <h2 className="text-xl font-bold">Fluxo de Caixa / Próximos Lançamentos</h2>
                                <div className="flex space-x-2">
                                    <div className="flex items-center text-xs font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full border border-green-100 italic">
                                        Entradas: R$ {financialEntries.filter(e => e.type === 'receivable').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="flex items-center text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100 italic">
                                        Saídas: R$ {financialEntries.filter(e => e.type === 'payable').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR')}
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-8 py-5">Vencimento</th>
                                            <th className="px-8 py-5">Descrição</th>
                                            <th className="px-8 py-5">Valor</th>
                                            <th className="px-8 py-5">Tipo</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm">
                                        {financialEntries.map(entry => (
                                            <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5 font-bold text-gray-400">{new Date(entry.due_date).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-8 py-5">
                                                    <div className="font-black text-gray-800">{entry.description}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">{entry.category}</div>
                                                </td>
                                                <td className={`px-8 py-5 font-black text-lg ${entry.type === 'receivable' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {entry.type === 'receivable' ? '+' : '-'} R$ {entry.amount.toLocaleString('pt-BR')}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${entry.type === 'receivable' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {entry.type === 'receivable' ? 'Entrada' : 'Saída'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${entry.status === 'paid' ? 'bg-blue-50 text-blue-500 border border-blue-100' : 'bg-amber-50 text-amber-500 border border-amber-100'}`}>
                                                        {entry.status === 'paid' ? 'Liquidado' : 'Em Aberto'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    {entry.status !== 'paid' ? (
                                                        <button
                                                            onClick={() => handleMarkAsPaid(entry)}
                                                            className="bg-primary text-white text-[10px] font-black px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                                        >
                                                            EFETUAR BAIXA
                                                        </button>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white rounded-[40px] border shadow-sm p-12 space-y-12">
                            <section>
                                <h3 className="text-2xl font-black text-gray-800 mb-2">Comunicação WhatsApp</h3>
                                <p className="text-sm text-gray-400 mb-8">Personalize a mensagem que o sistema envia automaticamente como lembrete.</p>
                                <textarea
                                    className="w-full p-8 bg-gray-50 rounded-[32px] border-none focus:ring-4 ring-primary/10 transition-all h-52 font-medium text-gray-700 leading-relaxed shadow-inner"
                                    placeholder="Olá {nome}, como está seu tratamento..."
                                    value={settings.message_template}
                                    onChange={e => setSettings({ ...settings, message_template: e.target.value })}
                                />
                                <button onClick={updateMessage} className="mt-6 bg-primary text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all">Salvar Alterações</button>
                                <p className="mt-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest ml-2">Dica: O campo {'{nome}'} é substituído pelo nome do cliente.</p>
                            </section>

                            <hr className="border-gray-100" />

                            <section>
                                <h3 className="text-2xl font-black text-gray-800 mb-2">Mídia do Lembrete</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div className="relative group rounded-[40px] overflow-hidden border-4 border-gray-50 shadow-xl aspect-square bg-gray-50 flex items-center justify-center">
                                        {settings.media_url ? (
                                            <>
                                                <img src={settings.media_url} alt="Mídia" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                    <label htmlFor="media-upload" className="bg-white text-gray-800 px-8 py-4 rounded-2xl font-black cursor-pointer hover:bg-primary hover:text-white transition-all">Alterar Arquivo</label>
                                                </div>
                                            </>
                                        ) : (
                                            <label htmlFor="media-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors group">
                                                <span className="material-symbols-outlined text-6xl text-gray-200 group-hover:text-primary transition-all">add_photo_alternate</span>
                                                <span className="text-xs font-black text-gray-300 mt-4 uppercase tracking-widest">Upload de Mídia</span>
                                            </label>
                                        )}
                                    </div>
                                    <div className="space-y-6">
                                        <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100">
                                            <h4 className="font-black text-blue-800 text-sm mb-2 uppercase tracking-wide">Importante</h4>
                                            <p className="text-sm text-blue-600/80 leading-relaxed font-medium">Arquivos enviados aqui serão hospedados no Supabase Storage e anexados aos links de lembrete dinâmicos gerados para seus clientes.</p>
                                        </div>
                                        <div className="flex items-center space-x-4 p-4 border rounded-2xl">
                                            <div className={`h-3 w-3 rounded-full animate-pulse ${uploading ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{uploading ? 'Enviando arquivo...' : 'Sistema Pronto'}</span>
                                        </div>
                                    </div>
                                    <input type="file" id="media-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals with Premium Glassmorphism Effect */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black text-gray-800">{editingClient?.id ? 'Editar Cadastro' : 'Novo Cliente'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveClient} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Dados Principais</label>
                                <input type="text" value={editingClient?.name || ''} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} placeholder="Nome Completo" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="email" value={editingClient?.email || ''} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} placeholder="Email Principal" className="p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                <input type="text" value={editingClient?.whatsapp || ''} onChange={e => setEditingClient({ ...editingClient, whatsapp: e.target.value })} placeholder="WhatsApp" className="p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nascimento</span>
                                    <input type="date" value={editingClient?.birth_date || ''} onChange={e => setEditingClient({ ...editingClient, birth_date: e.target.value })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Check-in Sono</span>
                                    <input type="time" value={editingClient?.sleep_schedule || ''} onChange={e => setEditingClient({ ...editingClient, sleep_schedule: e.target.value })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Origem do Lead</label>
                                <select value={editingClient?.purchase_location || 'site_oficial'} onChange={e => setEditingClient({ ...editingClient, purchase_location: e.target.value })} className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="site_oficial">🛒 Site Oficial</option>
                                    <option value="farmacia">🏥 Farmácia / Loja</option>
                                    <option value="clinica">🩺 Clínica Parceira</option>
                                    <option value="revendedor">🤝 Revendedor Autônomo</option>
                                </select>
                            </div>
                            <div className="flex space-x-6 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 transition-colors">Descartar</button>
                                <button type="submit" className="flex-[2] bg-primary text-white py-5 rounded-[20px] font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all">Sincronizar Dados</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black text-gray-800">{editingProduct?.id ? 'Configurar SKU' : 'Novo SKU'}</h2>
                            <button onClick={() => setIsProductModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="space-y-6">
                            <input type="text" value={editingProduct?.id || ''} onChange={e => setEditingProduct({ ...editingProduct, id: e.target.value })} placeholder="ID Único / SKU (ex: ltn-200ml)" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all disabled:opacity-30" disabled={!!editingProduct?.id && products.some(p => p.id === editingProduct.id)} required />
                            <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} placeholder="Nome Comercial do Produto" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Custo Unitário (R$)</span>
                                    <input type="number" step="0.01" value={editingProduct?.cost_price || 0} onChange={e => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">PVP (Venda R$)</span>
                                    <input type="number" step="0.01" value={editingProduct?.price || 0} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </label>
                            </div>
                            <label className="block">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Estoque Físico Disponível</span>
                                <input type="number" value={editingProduct?.stock_quantity || 0} onChange={e => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                            </label>
                            <div className="flex space-x-6 pt-6">
                                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 transition-colors">Voltar</button>
                                <button type="submit" className="flex-[2] bg-primary text-white py-5 rounded-[20px] font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all">Confirmar Registro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

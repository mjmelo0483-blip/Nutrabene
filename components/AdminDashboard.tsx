import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Registration {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    birth_date: string;
    sleep_schedule: string;
    purchase_location: string;
    establishment_name?: string;
    reseller_id?: string;
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
    category_id?: string;
    bank_account_id?: string;
    reseller_id?: string;
    client_id?: string;
    sale_id?: string;
    created_at?: string;
    entry_date?: string;
    payment_method?: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'other' | 'credit_acc';
    credit_card_id?: string;
    installments_total?: number;
    installment_number?: number;
}

interface Sale {
    id: string;
    product_id: string;
    reseller_id?: string;
    client_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number; // Gross total
    discount_percentage: number;
    discount_amount: number;
    net_amount: number; // Final amount to receive
    sale_date: string;
    due_date?: string;
    payment_status: string;
}

interface FinancialCategory {
    id: string;
    name: string;
    type: 'income' | 'expense';
}

interface CreditCard {
    id: string;
    name: string;
    limit_amount: number;
    current_balance: number;
    closing_day: number;
    due_day: number;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
};

const AdminDashboard: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'inventory' | 'sales' | 'resellers' | 'finances' | 'accounts' | 'categories' | 'settings'>('dashboard');
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [settings, setSettings] = useState<ReminderSettings>({ message_template: '' });
    const [products, setProducts] = useState<ProductInventory[]>([]);
    const [resellers, setResellers] = useState<Reseller[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);

    const [uploading, setUploading] = useState(false);
    const [updatingStock, setUpdatingStock] = useState<string | null>(null);
    const [dataError, setDataError] = useState('');

    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Modal State for CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<Registration> | null>(null);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<ProductInventory> | null>(null);

    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [saleForm, setSaleForm] = useState<Partial<Sale>>({
        quantity: 1,
        discount_percentage: 0,
        discount_amount: 0,
        total_price: 0,
        net_amount: 0,
        sale_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        payment_status: 'pending'
    });

    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [financialForm, setFinancialForm] = useState<Partial<FinancialEntry>>({
        type: 'payable',
        due_date: new Date().toISOString().split('T')[0],
        entry_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        payment_method: 'cash',
        installments_total: 1
    });

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [accountForm, setAccountForm] = useState<Partial<BankAccount>>({ balance: 0 });

    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [cardForm, setCardForm] = useState<Partial<CreditCard>>({ limit_amount: 0, current_balance: 0 });

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryForm, setCategoryForm] = useState<Partial<FinancialCategory>>({ type: 'expense' });

    const [isResellerModalOpen, setIsResellerModalOpen] = useState(false);
    const [resellerForm, setResellerForm] = useState<Partial<Reseller>>({ commission_rate: 20 });

    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
    const [selectedResellerForClosing, setSelectedResellerForClosing] = useState<Reseller | null>(null);

    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

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
                { data: sls },
                { data: cards },
                { data: cats }
            ] = await Promise.all([
                supabase.from('registrations').select('*').order('created_at', { ascending: false }),
                supabase.from('reminder_settings').select('message_template, media_url').eq('key', 'default').single(),
                supabase.from('products').select('*').order('name'),
                supabase.from('resellers').select('*').order('name'),
                supabase.from('bank_accounts').select('*').order('name'),
                supabase.from('financial_entries').select('*').order('due_date', { ascending: true }),
                supabase.from('sales').select('*').order('sale_date', { ascending: false }),
                supabase.from('credit_cards').select('*').order('name'),
                supabase.from('financial_categories').select('*').order('name')
            ]);

            if (regs) setRegistrations(regs);
            if (sett) setSettings(sett);
            if (prods) setProducts(prods);
            if (resel) setResellers(resel);
            if (banks) setBankAccounts(banks);
            if (fin) setFinancialEntries(fin);
            if (sls) setSales(sls);
            if (cards) setCreditCards(cards);
            if (cats) setCategories(cats);
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

        if (error) showNotification(`Erro: ${error.message}`, 'error');
        else {
            showNotification(clientData.id ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
            setIsModalOpen(false);
            setEditingClient(null);
            fetchData();
        }
    }

    async function handleDeleteClient(id: string) {
        askConfirmation(
            'Excluir Cliente',
            'Deseja excluir permanentemente este cliente?',
            async () => {
                const { error } = await supabase.from('registrations').delete().eq('id', id);
                if (error) showNotification(`Erro ao excluir: ${error.message}`, 'error');
                else {
                    showNotification('Cliente removido com sucesso!');
                    fetchData();
                }
            }
        );
    }

    // --- Product/Stock Handlers ---
    async function handleUpdateStock(id: string, newQuantity: number) {
        if (newQuantity < 0) return;
        setUpdatingStock(id);
        const { error } = await supabase.from('products').update({ stock_quantity: newQuantity }).eq('id', id);
        if (error) showNotification(`Erro ao atualizar estoque: ${error.message}`, 'error');
        else setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p));
        setUpdatingStock(null);
    }

    async function handleSaveProduct(e: React.FormEvent) {
        e.preventDefault();
        if (!editingProduct) return;

        if (!editingProduct.name || (editingProduct.price || 0) <= 0) {
            showNotification('Preencha o nome e um preço válido!', 'error');
            return;
        }

        let error;
        if (editingProduct.id && products.find(p => p.id === editingProduct.id)) {
            const { id, ...updateData } = editingProduct;
            const { error: updError } = await supabase.from('products').update(updateData).eq('id', id);
            error = updError;
        } else {
            const { error: insError } = await supabase.from('products').insert([editingProduct]);
            error = insError;
        }

        if (error) showNotification(`Erro ao salvar produto: ${error.message}`, 'error');
        else {
            showNotification('Produto salvo com sucesso!');
            setIsProductModalOpen(false);
            setEditingProduct(null);
            fetchData();
        }
    }

    async function handleDeleteProduct(id: string) {
        askConfirmation(
            'Excluir Produto',
            'Deseja excluir este produto?',
            async () => {
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (error) showNotification(`Erro ao excluir produto: ${error.message}`, 'error');
                else {
                    showNotification('Produto removido!');
                    fetchData();
                }
            }
        );
    }

    // --- Reseller Handlers ---
    async function handleSaveReseller(e: React.FormEvent) {
        e.preventDefault();
        if (!resellerForm.name || !resellerForm.whatsapp) {
            showNotification('Nome e WhatsApp são obrigatórios!', 'error');
            return;
        }

        let error;
        if (resellerForm.id) {
            const { id, ...updateData } = resellerForm;
            const { error: updError } = await supabase.from('resellers').update(updateData).eq('id', id);
            error = updError;
        } else {
            const { error: insError } = await supabase.from('resellers').insert([resellerForm]);
            error = insError;
        }

        if (error) showNotification(`Erro ao salvar revendedor: ${error.message}`, 'error');
        else {
            showNotification('Revendedor salvo com sucesso!');
            setIsResellerModalOpen(false);
            setResellerForm({ commission_rate: 20 });
            fetchData();
        }
    }

    async function handleDeleteReseller(id: string) {
        askConfirmation(
            'Excluir Revendedor',
            'Deseja excluir este revendedor?',
            async () => {
                const { error } = await supabase.from('resellers').delete().eq('id', id);
                if (error) showNotification(`Erro ao excluir revendedor: ${error.message}`, 'error');
                else {
                    showNotification('Revendedor removido!');
                    fetchData();
                }
            }
        );
    }

    async function handleCloseCommissions(resellerId: string, saleIds: string[]) {
        if (saleIds.length === 0) return;

        setLoading(true);
        try {
            const { error: saleError } = await supabase
                .from('sales')
                .update({ payment_status: 'paid' })
                .in('id', saleIds);

            if (saleError) throw saleError;

            const { error: finError } = await supabase
                .from('financial_entries')
                .update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
                .in('sale_id', saleIds);

            if (finError) throw finError;

            showNotification('Comissões fechadas e marcadas como pagas!');
            setIsClosingModalOpen(false);
            fetchData();
        } catch (error: any) {
            showNotification(`Erro ao fechar comissões: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    // --- Sale Handlers ---
    async function handleRegisterSale(e: React.FormEvent) {
        e.preventDefault();
        if (!saleForm.product_id || !saleForm.quantity || !saleForm.total_price || !saleForm.net_amount) {
            showNotification('Preencha os campos obrigatórios!', 'error');
            return;
        }

        const product = products.find(p => p.id === saleForm.product_id);
        if (!product) return;

        // If editing, handle stock adjustment difference
        if (saleForm.id) {
            const oldSale = sales.find(s => s.id === saleForm.id);
            if (oldSale) {
                // Check if product changed
                if (oldSale.product_id === saleForm.product_id) {
                    const diff = (saleForm.quantity || 0) - oldSale.quantity;
                    if (product.stock_quantity < diff) {
                        showNotification('Estoque insuficiente para a alteração!', 'error');
                        return;
                    }
                    // Update stock with the difference in database
                    await supabase.from('products').update({ stock_quantity: product.stock_quantity - diff }).eq('id', product.id);
                } else {
                    // Product changed: restore old product stock, decrement new product stock
                    const oldProduct = products.find(p => p.id === oldSale.product_id);
                    if (oldProduct) {
                        await supabase.from('products').update({ stock_quantity: oldProduct.stock_quantity + oldSale.quantity }).eq('id', oldProduct.id);
                    }

                    if (product.stock_quantity < (saleForm.quantity || 0)) {
                        showNotification('Estoque insuficiente no novo produto!', 'error');
                        // Rollback old product stock
                        if (oldProduct) await supabase.from('products').update({ stock_quantity: oldProduct.stock_quantity }).eq('id', oldProduct.id);
                        return;
                    }
                    await supabase.from('products').update({ stock_quantity: product.stock_quantity - (saleForm.quantity || 0) }).eq('id', product.id);
                }

                // Update the sale
                const { error: updError } = await supabase.from('sales').update(saleForm).eq('id', saleForm.id);
                if (updError) { showNotification(updError.message, 'error'); return; }

                // Update the corresponding financial entry
                await supabase.from('financial_entries')
                    .update({
                        amount: saleForm.net_amount,
                        due_date: saleForm.due_date,
                        description: `Venda #${saleForm.id.slice(0, 8)} - ${product.name} (Editado)`
                    })
                    .eq('sale_id', saleForm.id);
            }
        } else {
            // New sale
            if (product.stock_quantity < (saleForm.quantity || 0)) {
                showNotification('Estoque insuficiente para esta venda!', 'error');
                return;
            }

            const { data: sale, error: slsError } = await supabase.from('sales').insert([saleForm]).select().single();
            if (slsError) { showNotification(`Erro na venda: ${slsError.message}`, 'error'); return; }

            // Decrement stock in database
            await supabase.from('products').update({ stock_quantity: product.stock_quantity - (saleForm.quantity || 0) }).eq('id', product.id);

            // Create financial entry
            await supabase.from('financial_entries').insert([{
                type: 'receivable',
                description: `Venda #${sale.id.slice(0, 8)} - ${product.name}`,
                amount: saleForm.net_amount,
                due_date: saleForm.due_date || new Date().toISOString().split('T')[0],
                status: 'pending',
                category: 'Venda de Produto',
                sale_id: sale.id,
                reseller_id: saleForm.reseller_id,
                client_id: saleForm.client_id
            }]);
        }

        showNotification(saleForm.id ? 'Venda atualizada com sucesso!' : 'Venda registrada com sucesso!');
        setIsSaleModalOpen(false);
        fetchData();
    }

    async function handleDeleteSale(id: string) {
        askConfirmation(
            'Excluir Venda',
            'Deseja excluir esta venda? ATENÇÃO: O estoque será restaurado automaticamente.',
            async () => {
                const sale = sales.find(s => s.id === id);
                if (!sale) return;

                // Restore stock
                const product = products.find(p => p.id === sale.product_id);
                if (product) {
                    await supabase.from('products').update({ stock_quantity: product.stock_quantity + sale.quantity }).eq('id', product.id);
                }

                // Delete associated financial entry
                await supabase.from('financial_entries').delete().eq('sale_id', id);

                // Delete sale
                const { error } = await supabase.from('sales').delete().eq('id', id);
                if (error) showNotification(`Erro ao excluir: ${error.message}`, 'error');
                else {
                    showNotification('Venda e registros associados removidos.');
                    fetchData();
                }
            }
        );
    }

    // --- Financial Handlers ---
    async function handleSaveFinancialEntry(e: React.FormEvent) {
        e.preventDefault();
        if (!financialForm.description || !financialForm.amount) {
            showNotification('Descrição e valor são obrigatórios!', 'error');
            return;
        }

        const category = categories.find(c => c.id === financialForm.category_id)?.name || financialForm.category || 'Geral';
        const entryData = { ...financialForm, category };

        try {
            const bankId = entryData.bank_account_id || bankAccounts[0]?.id;
            const bank = bankAccounts.find(b => b.id === bankId);

            if (entryData.id) {
                // Update existing
                const { data: oldEntry } = await supabase.from('financial_entries').select('*').eq('id', entryData.id).single();
                const { id, ...updateData } = entryData;

                const { error } = await supabase.from('financial_entries').update(updateData).eq('id', id);
                if (error) throw error;

                // Update bank balance if status changed to/from 'paid'
                if (bank && oldEntry && oldEntry.status !== entryData.status) {
                    let balanceAdjustment = 0;
                    if (entryData.status === 'paid') {
                        // Just paid
                        balanceAdjustment = entryData.type === 'receivable' ? entryData.amount : -entryData.amount;
                    } else if (oldEntry.status === 'paid') {
                        // Was paid, now reverted
                        balanceAdjustment = oldEntry.type === 'receivable' ? -oldEntry.amount : oldEntry.amount;
                    }

                    if (balanceAdjustment !== 0) {
                        await supabase.from('bank_accounts')
                            .update({ balance: bank.balance + balanceAdjustment })
                            .eq('id', bank.id);
                    }
                }
            } else {
                // Create New (handle installments if credit card)
                const installments = entryData.payment_method === 'credit_card' ? (entryData.installments_total || 1) : 1;
                const baseAmount = entryData.amount;
                const installmentAmount = parseFloat((baseAmount / installments).toFixed(2));
                const entriesToInsert = [];

                for (let i = 1; i <= installments; i++) {
                    const entryDate = new Date(entryData.entry_date || new Date());
                    const dueDate = new Date(entryData.due_date || new Date());

                    if (i > 1) {
                        dueDate.setMonth(dueDate.getMonth() + (i - 1));
                    }

                    entriesToInsert.push({
                        ...entryData,
                        bank_account_id: bankId,
                        amount: i === installments ? parseFloat((baseAmount - (installmentAmount * (installments - 1))).toFixed(2)) : installmentAmount,
                        due_date: dueDate.toISOString().split('T')[0],
                        installment_number: i,
                        installments_total: installments,
                        description: installments > 1 ? `${entryData.description} (${i}/${installments})` : entryData.description
                    });
                }

                const { error } = await supabase.from('financial_entries').insert(entriesToInsert);
                if (error) throw error;

                // Updated balance immediately if new entry is ALREADY paid
                if (bank && entryData.status === 'paid') {
                    const balanceAdjustment = entryData.type === 'receivable' ? baseAmount : -baseAmount;
                    await supabase.from('bank_accounts')
                        .update({ balance: bank.balance + balanceAdjustment })
                        .eq('id', bank.id);
                }

                // Impact Credit Card Balance if it's a credit card expense
                if (entryData.payment_method === 'credit_card' && entryData.credit_card_id && entryData.type === 'payable') {
                    const card = creditCards.find(c => c.id === entryData.credit_card_id);
                    if (card) {
                        await supabase.from('credit_cards')
                            .update({ current_balance: card.current_balance + baseAmount })
                            .eq('id', card.id);
                    }
                }
            }

            showNotification(entryData.id ? 'Lançamento atualizado!' : 'Lançamento(s) gravado(s) com sucesso!');
            setIsFinancialModalOpen(false);
            fetchData();
        } catch (error: any) {
            showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    async function handleMarkAsPaid(entry: FinancialEntry) {
        if (entry.status === 'paid') return;

        const bankId = entry.bank_account_id || bankAccounts[0]?.id;
        if (!bankId) { showNotification('Configure uma conta bancária primeiro!', 'error'); return; }

        const bank = bankAccounts.find(b => b.id === bankId);
        if (!bank) return;

        const newBalance = entry.type === 'receivable' ? bank.balance + entry.amount : bank.balance - entry.amount;

        const { error: bankError } = await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', bankId);
        if (bankError) { showNotification(`Erro no banco: ${bankError.message}`, 'error'); return; }

        const { error: entryError } = await supabase.from('financial_entries').update({
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0],
            bank_account_id: bankId
        }).eq('id', entry.id);

        if (entryError) showNotification(`Erro ao liquidar: ${entryError.message}`, 'error');
        else {
            showNotification('Lançamento liquidado com sucesso!');
            fetchData();
        }
    }

    async function handleDeleteFinancial(id: string) {
        askConfirmation(
            'Excluir Lançamento',
            'Deseja excluir este lançamento?',
            async () => {
                const { error } = await supabase.from('financial_entries').delete().eq('id', id);
                if (error) showNotification(`Erro ao excluir lançamento: ${error.message}`, 'error');
                else {
                    showNotification('Lançamento financeiro removido.');
                    fetchData();
                }
            }
        );
    }

    // --- Accounts/Cards/Categories Handlers ---
    async function handleSaveAccount(e: React.FormEvent) {
        e.preventDefault();
        let error;
        const payload = { ...accountForm };
        if (accountForm.id) {
            const { id, ...data } = payload;
            const { error: err } = await supabase.from('bank_accounts').update(data).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('bank_accounts').insert([payload]);
            error = err;
        }
        if (error) showNotification(`Erro no banco: ${error.message}`, 'error');
        else {
            showNotification(accountForm.id ? 'Conta atualizada!' : 'Conta criada!');
            setIsAccountModalOpen(false);
            setAccountForm({ balance: 0 });
            fetchData();
        }
    }

    async function handleSaveCard(e: React.FormEvent) {
        e.preventDefault();
        let error;
        const payload = { ...cardForm };
        if (cardForm.id) {
            const { id, ...data } = payload;
            const { error: err } = await supabase.from('credit_cards').update(data).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('credit_cards').insert([payload]);
            error = err;
        }
        if (error) showNotification(`Erro no cartão: ${error.message}`, 'error');
        else {
            showNotification(cardForm.id ? 'Cartão atualizado!' : 'Cartão registrado!');
            setIsCardModalOpen(false);
            setCardForm({ limit_amount: 0, current_balance: 0 });
            fetchData();
        }
    }

    async function handleSaveCategory(e: React.FormEvent) {
        e.preventDefault();
        let error;
        const payload = { ...categoryForm };
        if (categoryForm.id) {
            const { id, ...data } = payload;
            const { error: err } = await supabase.from('financial_categories').update(data).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('financial_categories').insert([payload]);
            error = err;
        }
        if (error) showNotification(`Erro na categoria: ${error.message}`, 'error');
        else {
            showNotification(categoryForm.id ? 'Categoria atualizada!' : 'Categoria criada!');
            setIsCategoryModalOpen(false);
            setCategoryForm({ type: 'expense' });
            fetchData();
        }
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
            showNotification('Arquivo de mídia atualizado!');
        } catch (error: any) {
            showNotification(`Erro no upload: ${error.message}`, 'error');
        } finally { setUploading(false); }
    }

    const handleExportPDF = (reseller: Reseller, pendingSales: Sale[], totalCommission: number, totalNet: number) => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString('pt-BR');

        // Header Style
        doc.setFillColor(243, 244, 246);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo/Title
        try {
            doc.addImage('/assets/logo.png', 'PNG', 14, 10, 20, 20);
        } catch (e) {
            console.error('Error adding logo to PDF', e);
        }

        doc.setTextColor(31, 41, 55);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Nutrabene - Fechamento', 40, 22);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Parceiro: ${reseller.name}`, 40, 28);
        doc.text(`Data: ${date}`, 40, 33);

        // Summary Cards
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(14, 45, 85, 25, 3, 3);
        doc.roundedRect(110, 45, 85, 25, 3, 3);

        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('TOTAL COMISSÕES', 20, 52);
        doc.text('TOTAL LÍQUIDO', 116, 52);

        doc.setFontSize(16);
        doc.setTextColor(217, 119, 6); // Amber for commissions
        doc.text(`R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 62);

        doc.setTextColor(5, 150, 105); // Green for net
        doc.text(`R$ ${totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 116, 62);

        // Table
        const tableData = pendingSales.map(s => [
            formatDate(s.sale_date),
            formatDate(s.due_date),
            products.find(p => p.id === s.product_id)?.name || 'Produto Excluído',
            s.quantity,
            `R$ ${s.discount_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `R$ ${s.net_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [['Venda', 'Vencimento', 'Produto', 'Qtd', 'Comissão', 'Líquido']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [30, 64, 175], // Indigo/Blue
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                3: { halign: 'center' },
                4: { halign: 'right' },
                5: { halign: 'right' }
            },
            bodyStyles: {
                fontSize: 9
            }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('Relatório gerado automaticamente pelo sistema Nutrabene.', 14, finalY);

        doc.save(`Fechamento_${reseller.name.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`);
    };

    const handleExportDashboardPDF = (month: number, year: number, revenue: number, discounts: number, commissions: number, net: number, ranking: any[]) => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString('pt-BR');
        const monthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month];

        // Header Style
        doc.setFillColor(243, 244, 246);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo/Title
        try {
            doc.addImage('/assets/logo.png', 'PNG', 14, 10, 20, 20);
        } catch (e) {
            console.error('Error adding logo to PDF', e);
        }

        doc.setTextColor(31, 41, 55);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`Resumo Mensal - ${monthName} / ${year}`, 40, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Relatório Gerencial`, 40, 31);
        doc.text(`Data: ${date}`, 40, 36);

        // KPI Section
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO FINANCEIRO', 14, 50);

        autoTable(doc, {
            startY: 55,
            head: [['Descrição', 'Valor']],
            body: [
                ['Faturamento Bruto', `R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Total Descontos', `R$ ${discounts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Comissões Devidas', `R$ ${commissions.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Faturamento Líquido', `R$ ${net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [30, 64, 175] },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
        });

        // Ranking Section
        const nextY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.text('RANKING DE PRODUTOS', 14, nextY);

        autoTable(doc, {
            startY: nextY + 5,
            head: [['Pos', 'Produto', 'Qtd Vendida', 'Receita Líquida']],
            body: ranking.map((p, i) => [i + 1, p.name, p.sold, `R$ ${p.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]),
            theme: 'grid',
            headStyles: { fillColor: [30, 64, 175] },
            columnStyles: {
                0: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'right' }
            }
        });

        doc.save(`Relatorio_Nutrabene_${monthName}_${year}.pdf`);
    };

    async function updateMessage() {
        const { error } = await supabase.from('reminder_settings').update({ message_template: settings.message_template }).eq('key', 'default');
        if (error) showNotification(`Erro ao salvar: ${error.message}`, 'error');
        else showNotification('Template de mensagem atualizado!');
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
            case 'accounts': return 'account_balance';
            case 'categories': return 'category';
            case 'settings': return 'settings';
            default: return 'circle';
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-primary">Carregando painel...</div>;

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="bg-white w-full max-w-md rounded-3xl p-10 shadow-xl border border-gray-100">
                    <img src="/assets/logo.png" alt="Nutrabene" className="h-12 mx-auto mb-8" />
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

    const filteredSales = sales.filter(s => {
        const d = new Date(s.sale_date);
        return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total_price, 0);
    const totalDiscounts = filteredSales.filter(s => !s.reseller_id).reduce((acc, s) => acc + (s.discount_amount || 0), 0);
    const totalCommissions = filteredSales.filter(s => !!s.reseller_id).reduce((acc, s) => acc + (s.discount_amount || 0), 0);
    const finalNet = totalRevenue - totalDiscounts - totalCommissions;

    const productRanking = products.map((p: any) => ({
        ...p,
        sold: filteredSales.filter(s => s.product_id === p.id).reduce((acc, s) => acc + s.quantity, 0),
        revenue: filteredSales.filter(s => s.product_id === p.id).reduce((acc, s) => acc + s.net_amount, 0)
    })).filter((p: any) => p.sold > 0).sort((a: any, b: any) => b.sold - a.sold);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r flex flex-col fixed inset-y-0 left-0 z-20">
                <div className="p-8">
                    <img src="/assets/logo.png" alt="Nutrabene" className="h-10 mb-8" />
                    <nav className="space-y-1">
                        {['dashboard', 'clients', 'inventory', 'sales', 'resellers', 'finances', 'accounts', 'categories', 'settings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`w-full flex items-center px-4 py-4 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined mr-3">{getTabIcon(tab)}</span>
                                <span className="capitalize">{tab === 'clients' ? 'Clientes' : tab === 'inventory' ? 'Estoque' : tab === 'sales' ? 'Vendas' : tab === 'resellers' ? 'Revendedores' : tab === 'finances' ? 'Financeiro' : tab === 'accounts' ? 'Contas / Cartões' : tab === 'categories' ? 'Categorias' : tab === 'settings' ? 'Configurações' : 'Dashboard'}</span>
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
            <main className="flex-1 ml-72 p-6 pb-24">
                <header className="flex justify-between items-start mb-8">
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

                    {activeTab === 'dashboard' && (
                        <div className="flex space-x-2">
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                                className="bg-white border rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 ring-primary/20"
                            >
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                className="bg-white border rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 ring-primary/20"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => handleExportDashboardPDF(filterMonth, filterYear, totalRevenue, totalDiscounts, totalCommissions, finalNet, productRanking)}
                                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center hover:bg-red-600 hover:text-white transition-all border border-red-100"
                            >
                                <span className="material-symbols-outlined text-sm mr-2">picture_as_pdf</span> PDF
                            </button>
                        </div>
                    )}
                </header>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Faturamento Bruto</p>
                                <p className="text-xl font-black text-gray-800 whitespace-nowrap">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-gray-400 mt-1">No mês selecionado</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">sell</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Total Descontos</p>
                                <p className="text-xl font-black text-red-600 whitespace-nowrap">R$ {totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Concedidos em vendas</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">handshake</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Comissões Devidas</p>
                                <p className="text-xl font-black text-amber-600 whitespace-nowrap">R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Para revendedores</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm group hover:border-primary transition-colors">
                                <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Faturamento Líquido</p>
                                <p className="text-xl font-black text-green-600 whitespace-nowrap">R$ {finalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Após descontos e comissões</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white p-8 rounded-3xl border shadow-sm">
                                    <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="material-symbols-outlined mr-2 text-primary">analytics</span>
                                            Ranking de Produtos Mais Vendidos
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">{filteredSales.length} vendas no período</span>
                                    </h3>
                                    <div className="space-y-4">
                                        {productRanking.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed rounded-3xl">
                                                Nenhuma venda registrada neste período.
                                            </div>
                                        ) : (
                                            productRanking.map((p, idx) => (
                                                <div key={p.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors group">
                                                    <div className="flex items-center space-x-4">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">{p.name}</p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-black">{p.sold} unidades vendidas</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-gray-800">R$ {p.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                        <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${(p.sold / productRanking[0].sold) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-white p-8 rounded-3xl border shadow-sm">
                                    <h3 className="text-lg font-bold mb-6 flex items-center">
                                        <span className="material-symbols-outlined mr-2 text-primary">account_balance</span>
                                        Finanças Pendentes
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-5 bg-green-50 rounded-2xl border border-green-100">
                                            <div className="flex items-center text-green-800">
                                                <span className="material-symbols-outlined mr-3">arrow_upward</span>
                                                <span className="font-bold">Total a Receber</span>
                                            </div>
                                            <span className="font-black text-green-600 text-lg whitespace-nowrap">
                                                R$ {financialEntries.filter(e => e.type === 'receivable' && e.status !== 'paid').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-5 bg-red-50 rounded-2xl border border-red-100">
                                            <div className="flex items-center text-red-800">
                                                <span className="material-symbols-outlined mr-3">arrow_downward</span>
                                                <span className="font-bold">Total a Pagar</span>
                                            </div>
                                            <span className="font-black text-red-600 text-lg whitespace-nowrap">
                                                R$ {financialEntries.filter(e => e.type === 'payable' && e.status !== 'paid').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 flex flex-col justify-center items-center text-center">
                                    <p className="text-sm font-bold text-primary/60 uppercase tracking-widest mb-2">Disponível em Bancos</p>
                                    <p className="text-4xl font-black text-primary whitespace-nowrap">
                                        R$ {bankAccounts.reduce((acc, b) => acc + b.balance, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                                        {bankAccounts.map(b => (
                                            <div key={b.id} className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 border whitespace-nowrap">
                                                {b.name}: R$ {b.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        ))}
                                    </div>
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
                                        <th className="px-4 py-5 text-center w-20">#</th>
                                        <th className="px-4 py-5">Cliente</th>
                                        <th className="px-4 py-5">Contato</th>
                                        <th className="px-4 py-5">Status VIP</th>
                                        <th className="px-4 py-5 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {registrations.map((reg, idx) => (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-5 text-center text-gray-300 font-bold">{idx + 1}</td>
                                            <td className="px-4 py-5">
                                                <div className="font-bold text-gray-800">{reg.name}</div>
                                                <div className="text-gray-400 text-xs">{reg.email}</div>
                                            </td>
                                            <td className="px-4 py-5 font-medium text-gray-600">{reg.whatsapp}</td>
                                            <td className="px-4 py-5">
                                                <div className="flex flex-col">
                                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase w-fit mb-1">
                                                        {reg.purchase_location?.replace('_', ' ') || 'Site Oficial'}
                                                    </span>
                                                    {reg.purchase_location === 'revendedor' && reg.establishment_name && (
                                                        <span className="text-[10px] text-gray-500 font-bold ml-1 flex items-center">
                                                            <span className="material-symbols-outlined text-[12px] mr-1">person</span>
                                                            {reg.establishment_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => { setEditingClient(reg); setIsModalOpen(true); }} className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteClient(reg.id)} className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
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
                                            <th className="px-4 py-5">Produto</th>
                                            <th className="px-4 py-5">Valores</th>
                                            <th className="px-4 py-5 text-center">Estoque</th>
                                            <th className="px-4 py-5 text-center">Status</th>
                                            <th className="px-4 py-5 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm text-gray-600">
                                        {products.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-5">
                                                    <div className="font-bold text-gray-800 text-xs">{p.name}</div>
                                                    <div className="text-[9px] text-gray-300 font-mono">{p.id}</div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex space-x-4">
                                                        <div>
                                                            <span className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Custo</span>
                                                            <span className="font-medium text-gray-500 text-xs">R$ {p.cost_price.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Venda</span>
                                                            <span className="font-black text-green-600 text-xs">R$ {p.price.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button onClick={() => handleUpdateStock(p.id, p.stock_quantity - 1)} disabled={updatingStock === p.id} className="h-6 w-6 rounded-lg border flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                                            <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                                                        </button>
                                                        <span className={`text-xs font-black w-6 text-center ${p.stock_quantity <= 5 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock_quantity}</span>
                                                        <button onClick={() => handleUpdateStock(p.id, p.stock_quantity + 1)} disabled={updatingStock === p.id} className="h-6 w-6 rounded-lg border flex items-center justify-center hover:bg-green-50 hover:text-green-500 transition-all shadow-sm">
                                                            <span className="material-symbols-outlined text-[10px] font-bold">add</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    {p.stock_quantity === 0 ? <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase whitespace-nowrap">Sem Estoque</span> :
                                                        p.stock_quantity <= 5 ? <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase whitespace-nowrap">Baixo Estoque</span> :
                                                            <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase whitespace-nowrap">OK</span>}
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex justify-center space-x-1">
                                                        <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="h-7 w-7 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                                                            <span className="material-symbols-outlined text-xs">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteProduct(p.id)} className="h-7 w-7 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
                                                            <span className="material-symbols-outlined text-xs">delete</span>
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
                                    setSaleForm({
                                        product_id: products[0]?.id,
                                        unit_price: products[0]?.price || 0,
                                        total_price: products[0]?.price || 0,
                                        discount_percentage: 0,
                                        discount_amount: 0,
                                        net_amount: products[0]?.price || 0,
                                        quantity: 1,
                                        sale_date: new Date().toISOString().split('T')[0],
                                        due_date: new Date().toISOString().split('T')[0],
                                        payment_status: 'pending'
                                    });
                                    setIsSaleModalOpen(true);
                                }}
                                className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center"
                            >
                                <span className="material-symbols-outlined mr-2">add_shopping_cart</span> Novo Lançamento de Venda
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
                                                <th className="px-4 py-5">Venda / Venc.</th>
                                                <th className="px-4 py-5">Produto / Cliente</th>
                                                <th className="px-4 py-5">Vendedor</th>
                                                <th className="px-4 py-5 text-center">Quant.</th>
                                                <th className="px-4 py-5 text-right">Total (Bruto)</th>
                                                <th className="px-4 py-5 text-right">Dedução / Com. (%)</th>
                                                <th className="px-4 py-5 text-right">Líquido</th>
                                                <th className="px-4 py-5 text-center">Status</th>
                                                <th className="px-4 py-5 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-sm">
                                            {sales.map(s => (
                                                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-5">
                                                        <div className="text-gray-500 font-medium whitespace-nowrap">{formatDate(s.sale_date)}</div>
                                                        <div className="text-[10px] text-amber-500 font-black uppercase whitespace-nowrap">Venc: {formatDate(s.due_date)}</div>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="font-bold text-gray-800">{products.find(p => p.id === s.product_id)?.name || 'Produto Excluído'}</div>
                                                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{registrations.find(c => c.id === s.client_id)?.name || 'Venda Avulsa'}</div>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="text-sm text-gray-600 font-bold">{resellers.find(r => r.id === s.reseller_id)?.name || 'Direta'}</div>
                                                    </td>
                                                    <td className="px-4 py-5 text-center font-bold">{s.quantity}</td>
                                                    <td className="px-4 py-5 text-right font-medium text-gray-500 text-[10px] whitespace-nowrap">R$ {s.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-5 text-right font-bold text-red-400 text-[10px] whitespace-nowrap">
                                                        - R$ {(s.discount_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        <span className="block text-[8px] opacity-70">({s.discount_percentage || 0}%) {s.reseller_id ? 'Comissão' : 'Desconto'}</span>
                                                    </td>
                                                    <td className="px-4 py-5 text-right font-black text-primary text-sm whitespace-nowrap">R$ {(s.net_amount || s.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-5 text-center text-xs">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {s.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="flex justify-center space-x-1">
                                                            <button onClick={() => { setSaleForm(s); setIsSaleModalOpen(true); }} className="h-7 w-7 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                                                                <span className="material-symbols-outlined text-xs">edit</span>
                                                            </button>
                                                            <button onClick={() => handleDeleteSale(s.id)} className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
                                                                <span className="material-symbols-outlined text-xs">delete</span>
                                                            </button>
                                                        </div>
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
                                    setResellerForm({ name: '', commission_rate: 20 });
                                    setIsResellerModalOpen(true);
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
                                            <button onClick={() => { setResellerForm(r); setIsResellerModalOpen(true); }} className="text-blue-400 hover:text-blue-600"><span className="material-symbols-outlined">edit</span></button>
                                            <button onClick={() => handleDeleteReseller(r.id)} className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined">delete</span></button>
                                        </div>
                                    </div>
                                    <h3 className="font-black text-gray-800 text-lg">{r.name}</h3>
                                    <p className="text-xs text-gray-400 mb-4">{r.whatsapp || 'Sem contato'}</p>
                                    <div className="flex justify-between items-center pt-4 border-t gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Comissão</span>
                                            <span className="font-black text-primary">{r.commission_rate}%</span>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedResellerForClosing(r); setIsClosingModalOpen(true); }}
                                            className="bg-gray-50 hover:bg-primary hover:text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all border flex items-center"
                                        >
                                            <span className="material-symbols-outlined text-sm mr-1">request_quote</span> Fechamento
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Finance Tab */}
                {activeTab === 'finances' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white px-4 py-6 rounded-3xl border shadow-sm flex flex-col justify-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Total Bancos</p>
                                <p className="text-xl font-black text-indigo-600 whitespace-nowrap">R$ {bankAccounts.reduce((acc, b) => acc + b.balance, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-white px-4 py-6 rounded-3xl border shadow-sm flex flex-col justify-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contas a Receber</p>
                                <p className="text-xl font-black text-green-600 whitespace-nowrap">R$ {financialEntries.filter(e => e.type === 'receivable' && e.status !== 'paid').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-white px-4 py-6 rounded-3xl border shadow-sm flex flex-col justify-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contas a Pagar</p>
                                <p className="text-xl font-black text-red-500 whitespace-nowrap">R$ {financialEntries.filter(e => e.type === 'payable' && e.status !== 'paid').reduce((acc, e) => acc + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setFinancialForm({
                                        type: 'payable',
                                        due_date: new Date().toISOString().split('T')[0],
                                        entry_date: new Date().toISOString().split('T')[0],
                                        status: 'pending'
                                    });
                                    setIsFinancialModalOpen(true);
                                }}
                                className="bg-primary text-white px-4 py-6 rounded-3xl shadow-xl shadow-primary/20 font-black flex items-center justify-center hover:scale-105 transition-all"
                            >
                                <span className="material-symbols-outlined mr-2">add_circle</span> Novo Lançamento
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-xl font-bold">Fluxo de Caixa / Movimentações</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-4 py-5">Vencimento</th>
                                            <th className="px-4 py-5">Descrição / Categoria</th>
                                            <th className="px-4 py-5 text-right">Valor</th>
                                            <th className="px-4 py-5 text-center">Status</th>
                                            <th className="px-4 py-5 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm">
                                        {financialEntries.map(entry => (
                                            <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-5 font-bold text-gray-400 whitespace-nowrap text-xs">{formatDate(entry.due_date)}</td>
                                                <td className="px-4 py-5">
                                                    <div className="font-black text-gray-800 text-xs">{entry.description}</div>
                                                    <div className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                                                        {categories.find(c => c.id === (entry as any).category_id)?.name || entry.category}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-5 text-right font-black text-xs whitespace-nowrap ${entry.type === 'receivable' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {entry.type === 'receivable' ? '+' : '-'} R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${entry.status === 'paid' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {entry.status === 'paid' ? 'Liquidado' : 'Aguardando'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex justify-center space-x-1">
                                                        {entry.status !== 'paid' && (
                                                            <button onClick={() => handleMarkAsPaid(entry)} title="Liquidar" className="h-7 w-7 text-green-500 hover:bg-green-50 rounded-lg flex items-center justify-center transition-colors">
                                                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setFinancialForm(entry); setIsFinancialModalOpen(true); }} className="h-7 w-7 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                                                            <span className="material-symbols-outlined text-xs">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteFinancial(entry.id)} className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
                                                            <span className="material-symbols-outlined text-xs">delete</span>
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

                {/* Accounts & Cards Tab */}
                {activeTab === 'accounts' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Bank Accounts Section */}
                            <section className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-gray-800">Contas Bancárias</h2>
                                    <button onClick={() => { setAccountForm({ balance: 0 }); setIsAccountModalOpen(true); }} className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm">
                                        <span className="material-symbols-outlined">add</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {bankAccounts.map(bank => (
                                        <div key={bank.id} className="bg-white px-4 py-5 rounded-3xl border shadow-sm flex justify-between items-center group">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{bank.name}</p>
                                                <p className="text-xl font-black text-gray-800 whitespace-nowrap">R$ {bank.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setAccountForm(bank); setIsAccountModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Credit Cards Section */}
                            <section className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-gray-800">Cartões de Crédito</h2>
                                    <button onClick={() => { setCardForm({ limit_amount: 0, current_balance: 0 }); setIsCardModalOpen(true); }} className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                        <span className="material-symbols-outlined">credit_card</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {creditCards.map(card => (
                                        <div key={card.id} className="bg-white px-4 py-5 rounded-3xl border shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4">
                                                <button onClick={() => { setCardForm(card); setIsCardModalOpen(true); }} className="text-gray-300 hover:text-blue-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{card.name}</p>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold uppercase">Fatura Atual</p>
                                                    <p className="text-xl font-black text-red-500 whitespace-nowrap">R$ {card.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-300 font-bold lowercase whitespace-nowrap">Limite: R$ {card.limit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <p className="text-[10px] text-gray-400 font-black">Vence dia {card.due_day}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* Categories Tab */}
                {activeTab === 'categories' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white p-8 rounded-3xl border shadow-sm flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Categorias Financeiras</h2>
                                <p className="text-sm text-gray-400">Organize seus gastos e receitas por tipo.</p>
                            </div>
                            <button onClick={() => { setCategoryForm({ type: 'expense' }); setIsCategoryModalOpen(true); }} className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center">
                                <span className="material-symbols-outlined mr-2">category</span> Nova Categoria
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-green-500 uppercase tracking-widest ml-4">Receitas</h3>
                                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                    <div className="divide-y">
                                        {categories.filter(c => c.type === 'income').map(cat => (
                                            <div key={cat.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                <span className="font-bold text-gray-700">{cat.name}</span>
                                                <button onClick={() => { setCategoryForm(cat); setIsCategoryModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest ml-4">Despesas</h3>
                                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                    <div className="divide-y">
                                        {categories.filter(c => c.type === 'expense').map(cat => (
                                            <div key={cat.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                <span className="font-bold text-gray-700">{cat.name}</span>
                                                <button onClick={() => { setCategoryForm(cat); setIsCategoryModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
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

                {/* Notification Toast */}
                {notification && (
                    <div className={`fixed top-10 right-10 z-[200] px-8 py-5 rounded-[25px] font-black shadow-2xl animate-in slide-in-from-right-10 duration-500 flex items-center ${notification.type === 'success' ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-500 text-white shadow-red-200'}`}>
                        <span className="material-symbols-outlined mr-3">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
                        {notification.message}
                    </div>
                )}

                {/* Confirm Modal */}
                {confirmModal?.isOpen && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl text-center">
                            <h3 className="text-xl font-black text-gray-800 mb-2">{confirmModal.title}</h3>
                            <p className="text-sm text-gray-500 mb-8">{confirmModal.message}</p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        confirmModal.onConfirm();
                                        setConfirmModal(null);
                                    }}
                                    className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-200"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Reseller Modal */}
            {isResellerModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-gray-800">{resellerForm.id ? 'Editar Parceiro' : 'Novo Parceiro'}</h2>
                            <button onClick={() => setIsResellerModalOpen(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                        <form onSubmit={handleSaveReseller} className="space-y-6">
                            <input type="text" value={resellerForm.name || ''} onChange={e => setResellerForm({ ...resellerForm, name: e.target.value })} placeholder="Nome do Parceiro" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <input type="text" value={resellerForm.whatsapp || ''} onChange={e => setResellerForm({ ...resellerForm, whatsapp: e.target.value })} placeholder="WhatsApp" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Taxa de Comissão (%)</label>
                                <input type="number" value={resellerForm.commission_rate || 20} onChange={e => setResellerForm({ ...resellerForm, commission_rate: parseFloat(e.target.value) })} className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-5 rounded-[20px] font-black shadow-xl">Salvar Parceiro</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Financial Entry Modal */}
            {isFinancialModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-800">{financialForm.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                            <button onClick={() => setIsFinancialModalOpen(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveFinancialEntry} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setFinancialForm({ ...financialForm, type: 'receivable' })} className={`py-3 rounded-2xl font-black transition-all ${financialForm.type === 'receivable' ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-400'}`}>RECEITA</button>
                                <button type="button" onClick={() => setFinancialForm({ ...financialForm, type: 'payable' })} className={`py-3 rounded-2xl font-black transition-all ${financialForm.type === 'payable' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-gray-50 text-gray-400'}`}>DESPESA</button>
                            </div>
                            <input type="text" value={financialForm.description || ''} onChange={e => setFinancialForm({ ...financialForm, description: e.target.value })} placeholder="Descrição" className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all italic" required />
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Valor (R$)</label>
                                <input type="number" step="0.01" value={financialForm.amount || ''} onChange={e => setFinancialForm({ ...financialForm, amount: parseFloat(e.target.value) })} placeholder="0,00" className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all font-bold text-lg" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Data Lançamento</span>
                                    <input type="date" value={financialForm.entry_date || ''} onChange={e => setFinancialForm({ ...financialForm, entry_date: e.target.value })} className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Vencimento</span>
                                    <input type="date" value={financialForm.due_date || ''} onChange={e => setFinancialForm({ ...financialForm, due_date: e.target.value })} className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Meio de Pagamento</label>
                                    <select
                                        value={financialForm.payment_method || 'cash'}
                                        onChange={e => setFinancialForm({ ...financialForm, payment_method: e.target.value as any })}
                                        className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="cash">💵 Dinheiro</option>
                                        <option value="pix">📱 Pix</option>
                                        <option value="debit_card">💳 Débito C/c</option>
                                        <option value="credit_card">💳 Cartão de Crédito</option>
                                        <option value="credit_acc">💳 Crédito C/c</option>
                                        <option value="other"> outros</option>
                                    </select>
                                </div>
                                {financialForm.payment_method === 'credit_card' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Parcelas</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="48"
                                            value={financialForm.installments_total || 1}
                                            onChange={e => setFinancialForm({ ...financialForm, installments_total: parseInt(e.target.value) })}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            {financialForm.payment_method === 'credit_card' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Selecionar Cartão</label>
                                    <select
                                        value={financialForm.credit_card_id || ''}
                                        onChange={e => setFinancialForm({ ...financialForm, credit_card_id: e.target.value })}
                                        className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                        required={financialForm.payment_method === 'credit_card'}
                                    >
                                        <option value="">Selecione o Cartão</option>
                                        {creditCards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Status</label>
                                    <select
                                        value={financialForm.status || 'pending'}
                                        onChange={e => setFinancialForm({ ...financialForm, status: e.target.value as any })}
                                        className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer font-bold"
                                    >
                                        <option value="pending">⏳ Aguardando</option>
                                        <option value="paid">✅ Pago / Liquidado</option>
                                        <option value="overdue">⚠️ Atrasado</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Conta Bancária</label>
                                    <select
                                        value={financialForm.bank_account_id || ''}
                                        onChange={e => setFinancialForm({ ...financialForm, bank_account_id: e.target.value })}
                                        className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                        required={financialForm.status === 'paid' && financialForm.payment_method !== 'credit_card'}
                                    >
                                        <option value="">Selecione a Conta</option>
                                        {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Categoria</label>
                                <select value={(financialForm as any).category_id || ''} onChange={e => setFinancialForm({ ...financialForm, category_id: e.target.value })} className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">Selecione a Categoria</option>
                                    {categories
                                        .filter(c => (financialForm.type === 'receivable' ? c.type === 'income' : c.type === 'expense'))
                                        .map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div className="flex space-x-6 pt-6">
                                <button type="button" onClick={() => setIsFinancialModalOpen(false)} className="flex-1 py-5 font-bold text-gray-400">Descartar</button>
                                <button type="submit" className="flex-[2] bg-primary text-white py-5 rounded-[20px] font-black shadow-xl shadow-primary/30">Gravar Lançamento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bank Account Modal */}
            {isAccountModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-gray-800">{accountForm.id ? 'Editar Conta' : 'Nova Conta'}</h2>
                            <button onClick={() => setIsAccountModalOpen(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                        <form onSubmit={handleSaveAccount} className="space-y-6">
                            <input type="text" value={accountForm.name || ''} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Nome do Banco / Carteira" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <input type="number" step="0.01" value={accountForm.balance || 0} onChange={e => setAccountForm({ ...accountForm, balance: parseFloat(e.target.value) })} placeholder="Saldo Inicial (R$)" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <button type="submit" className="w-full bg-primary text-white py-5 rounded-[20px] font-black shadow-xl">Salvar Conta</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Credit Card Modal */}
            {isCardModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-gray-800">{cardForm.id ? 'Editar Cartão' : 'Novo Cartão'}</h2>
                            <button onClick={() => setIsCardModalOpen(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                        <form onSubmit={handleSaveCard} className="space-y-6">
                            <input type="text" value={cardForm.name || ''} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Nome do Cartão" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Fechamento</span>
                                    <input type="number" min="1" max="31" value={cardForm.closing_day || ''} onChange={e => setCardForm({ ...cardForm, closing_day: parseInt(e.target.value) })} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1" required />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Vencimento</span>
                                    <input type="number" min="1" max="31" value={cardForm.due_day || ''} onChange={e => setCardForm({ ...cardForm, due_day: parseInt(e.target.value) })} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1" required />
                                </label>
                            </div>
                            <input type="number" step="0.01" value={cardForm.limit_amount || 0} onChange={e => setCardForm({ ...cardForm, limit_amount: parseFloat(e.target.value) })} placeholder="Limite Total (R$)" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black shadow-xl">Salvar Cartão</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Closing Commissions Modal */}
            {isClosingModalOpen && selectedResellerForClosing && (() => {
                const pendingSales = sales.filter(s => s.reseller_id === selectedResellerForClosing.id && s.payment_status !== 'paid');
                const totalPendingCommission = pendingSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0);
                const totalPendingNet = pendingSales.reduce((acc, s) => acc + s.net_amount, 0);

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800">Fechamento: {selectedResellerForClosing.name}</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Vendas Pendentes de Acerto</p>
                                </div>
                                <button onClick={() => setIsClosingModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Total Comissões</p>
                                    <p className="text-2xl font-black text-amber-700">R$ {totalPendingCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10">
                                    <p className="text-[10px] font-black text-primary uppercase mb-1">Total Líquido</p>
                                    <p className="text-2xl font-black text-primary">R$ {totalPendingNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto mb-6 pr-2">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-3 py-3 rounded-l-xl">Venda</th>
                                            <th className="px-3 py-3">Vencimento</th>
                                            <th className="px-3 py-3">Produto</th>
                                            <th className="px-3 py-3 text-right">Qtd</th>
                                            <th className="px-3 py-3 text-right">Comissão</th>
                                            <th className="px-3 py-3 text-right rounded-r-xl">Líquido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-xs">
                                        {pendingSales.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-gray-400 font-bold italic">Nenhuma venda pendente para este revendedor.</td>
                                            </tr>
                                        ) : (
                                            pendingSales.map(s => (
                                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-3 py-4 font-medium text-gray-500">{formatDate(s.sale_date)}</td>
                                                    <td className="px-3 py-4 font-bold text-amber-500">{formatDate(s.due_date)}</td>
                                                    <td className="px-3 py-4 font-bold text-gray-700">{products.find(p => p.id === s.product_id)?.name}</td>
                                                    <td className="px-3 py-4 text-right font-bold">{s.quantity}</td>
                                                    <td className="px-3 py-4 text-right font-black text-amber-600">R$ {s.discount_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-3 py-4 text-right font-black text-primary">R$ {s.net_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsClosingModalOpen(false)}
                                    className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={() => handleExportPDF(selectedResellerForClosing, pendingSales, totalPendingCommission, totalPendingNet)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black shadow-sm flex items-center justify-center hover:bg-gray-200 transition-all"
                                >
                                    <span className="material-symbols-outlined mr-2">picture_as_pdf</span> PDF
                                </button>
                                <button
                                    disabled={pendingSales.length === 0}
                                    onClick={() => {
                                        askConfirmation(
                                            'Fechar Comissões',
                                            `Deseja marcar as ${pendingSales.length} vendas como pagas? Isso liquidará as entradas financeiras correspondentes.`,
                                            () => handleCloseCommissions(selectedResellerForClosing.id, pendingSales.map(s => s.id))
                                        );
                                    }}
                                    className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-30"
                                >
                                    Efetivar Fechamento Total
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-gray-800">{categoryForm.id ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="space-y-6">
                            <input type="text" value={categoryForm.name || ''} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Nome da Categoria" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" required />
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setCategoryForm({ ...categoryForm, type: 'income' })} className={`py-4 rounded-2xl font-black transition-all ${categoryForm.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400'}`}>RECEITA</button>
                                <button type="button" onClick={() => setCategoryForm({ ...categoryForm, type: 'expense' })} className={`py-4 rounded-2xl font-black transition-all ${categoryForm.type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-400'}`}>DESPESA</button>
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-5 rounded-[20px] font-black shadow-xl">Salvar Categoria</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modals with Premium Glassmorphism Effect */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                        <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-800">{editingClient?.id ? 'Editar Cadastro' : 'Novo Cliente'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSaveClient} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Dados Principais</label>
                                    <input type="text" value={editingClient?.name || ''} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} placeholder="Nome Completo" className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="email" value={editingClient?.email || ''} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} placeholder="Email Principal" className="p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                    <input type="text" value={editingClient?.whatsapp || ''} onChange={e => setEditingClient({ ...editingClient, whatsapp: e.target.value })} placeholder="WhatsApp" className="p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nascimento</span>
                                        <input type="date" value={editingClient?.birth_date || ''} onChange={setEditingClient && (e => setEditingClient({ ...editingClient, birth_date: e.target.value }))} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Check-in Sono</span>
                                        <input type="time" value={editingClient?.sleep_schedule || ''} onChange={setEditingClient && (e => setEditingClient({ ...editingClient, sleep_schedule: e.target.value }))} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Origem do Lead</label>
                                    <select
                                        value={editingClient?.purchase_location || 'site_oficial'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const updates: any = { purchase_location: val };
                                            if (val !== 'revendedor') {
                                                updates.reseller_id = null;
                                                updates.establishment_name = null;
                                            }
                                            setEditingClient({ ...editingClient, ...updates });
                                        }}
                                        className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="site_oficial">🛒 Site Oficial</option>
                                        <option value="loja_fisica">🏬 Loja Física</option>
                                        <option value="tiktok_shop">📱 TikTok Shop</option>
                                        <option value="revendedor">🤝 Revendedor</option>
                                    </select>
                                </div>

                                {editingClient?.purchase_location === 'revendedor' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Selecionar Revendedor</label>
                                        <select
                                            value={editingClient?.reseller_id || ''}
                                            onChange={e => {
                                                const sel = resellers.find(r => r.id === e.target.value);
                                                setEditingClient({ ...editingClient, reseller_id: e.target.value, establishment_name: sel?.name });
                                            }}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                            required={editingClient?.purchase_location === 'revendedor'}
                                        >
                                            <option value="">Selecione um Revendedor</option>
                                            {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="flex space-x-6 pt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 transition-colors">Descartar</button>
                                    <button type="submit" className="flex-[2] bg-primary text-white py-5 rounded-[20px] font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all">Sincronizar Dados</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isProductModalOpen && (
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
                )
            }

            {
                isSaleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[95vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-3xl font-black text-gray-800">Lançar Nova Venda</h2>
                                <button onClick={() => setIsSaleModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleRegisterSale} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Produto</label>
                                        <select
                                            value={saleForm.product_id || ''}
                                            onChange={e => {
                                                const p = products.find(prod => prod.id === e.target.value);
                                                const gross = (p?.price || 0) * (saleForm.quantity || 1);
                                                const discPerc = saleForm.discount_percentage || 0;
                                                const discAmt = gross * (discPerc / 100);
                                                setSaleForm({
                                                    ...saleForm,
                                                    product_id: e.target.value,
                                                    unit_price: p?.price || 0,
                                                    total_price: gross,
                                                    discount_amount: discAmt,
                                                    net_amount: gross - discAmt
                                                });
                                            }}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Selecione o Produto</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cliente</label>
                                        <select
                                            value={saleForm.client_id || ''}
                                            onChange={e => setSaleForm({ ...saleForm, client_id: e.target.value })}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecione o Cliente (Opcional)</option>
                                            {registrations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Vendedor / Revendedor</label>
                                        <select
                                            value={saleForm.reseller_id || ''}
                                            onChange={e => {
                                                const r = resellers.find(res => res.id === e.target.value);
                                                const discPerc = r ? r.commission_rate : 0;
                                                const gross = saleForm.total_price || 0;
                                                const discAmt = gross * (discPerc / 100);
                                                setSaleForm({
                                                    ...saleForm,
                                                    reseller_id: e.target.value,
                                                    discount_percentage: discPerc,
                                                    discount_amount: discAmt,
                                                    net_amount: gross - discAmt
                                                });
                                            }}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Venda Direta (Sem Revendedor)</option>
                                            {resellers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.commission_rate}%)</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Quantidade</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={saleForm.quantity || 1}
                                                onChange={e => {
                                                    const qty = parseInt(e.target.value);
                                                    const gross = (saleForm.unit_price || 0) * qty;
                                                    const discPerc = saleForm.discount_percentage || 0;
                                                    const discAmt = gross * (discPerc / 100);
                                                    setSaleForm({
                                                        ...saleForm,
                                                        quantity: qty,
                                                        total_price: gross,
                                                        discount_amount: discAmt,
                                                        net_amount: gross - discAmt
                                                    });
                                                }}
                                                className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">{saleForm.reseller_id ? 'Comissão (%)' : 'Desconto (%)'}</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={saleForm.discount_percentage || 0}
                                                onChange={e => {
                                                    const discPerc = parseFloat(e.target.value) || 0;
                                                    const gross = saleForm.total_price || 0;
                                                    const discAmt = gross * (discPerc / 100);
                                                    setSaleForm({
                                                        ...saleForm,
                                                        discount_percentage: discPerc,
                                                        discount_amount: discAmt,
                                                        net_amount: gross - discAmt
                                                    });
                                                }}
                                                className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all font-bold text-red-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-bold">Total Bruto:</span>
                                        <span className="font-black text-gray-800">R$ {saleForm.total_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-500">
                                        <span className="font-bold">{saleForm.reseller_id ? 'Comissão' : 'Desconto'} ({saleForm.discount_percentage}%):</span>
                                        <span className="font-black">- R$ {saleForm.discount_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-primary/20">
                                        <span className="text-primary font-black text-xl">Líquido a Receber:</span>
                                        <span className="text-primary font-black text-2xl">R$ {saleForm.net_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Data da Venda</label>
                                        <input
                                            type="date"
                                            value={saleForm.sale_date || ''}
                                            onChange={e => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Data de Vencimento</label>
                                        <input
                                            type="date"
                                            value={saleForm.due_date || ''}
                                            onChange={e => setSaleForm({ ...saleForm, due_date: e.target.value })}
                                            className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-6 pt-6">
                                    <button type="button" onClick={() => setIsSaleModalOpen(false)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-[2] bg-primary text-white py-5 rounded-[20px] font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all">Registrar Venda</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;

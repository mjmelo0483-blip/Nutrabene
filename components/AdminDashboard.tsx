import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
    initial_stock?: number;
    initial_stock_date?: string;
    expiration_date?: string;
}

interface InventoryMovement {
    id: string;
    product_id: string;
    type: 'purchase' | 'adjustment' | 'sale' | 'initial';
    quantity: number;
    unit_cost?: number;
    reason?: string;
    movement_date: string;
    expiration_date?: string;
    created_at?: string;
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
    net_amount: number; // Amount after discount, before card fee
    sale_date: string;
    due_date?: string;
    payment_status: string;
    payment_method?: string;
    installments?: number;
    card_brand?: string;
    card_fee_percent?: number;
    card_fee_amount?: number;
}

interface PaymentFee {
    id: string;
    brand: string;
    method: 'debit' | 'credit_cash' | 'credit_installments';
    fee_percentage: number;
}

interface FinancialCategory {
    id: string;
    name: string;
    type: 'income' | 'expense';
    parent_id?: string;
}

interface CreditCard {
    id: string;
    name: string;
    limit_amount: number;
    current_balance: number; // Initial/Reference balance, though we'll compute it
    closing_day: number;
    due_day: number;
    last_4_digits?: string;
    brand?: string;
    color?: string;
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

    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'inventory' | 'sales' | 'resellers' | 'finances' | 'accounts' | 'categories' | 'dre' | 'settings'>('dashboard');
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [settings, setSettings] = useState<ReminderSettings>({ message_template: '' });
    const [products, setProducts] = useState<ProductInventory[]>([]);
    const [resellers, setResellers] = useState<Reseller[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [paymentFees, setPaymentFees] = useState<PaymentFee[]>([]);

    const [uploading, setUploading] = useState(false);
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
        payment_method: 'pix',
        installments: 1,
        card_brand: '',
        card_fee_percent: 0,
        card_fee_amount: 0,
        sale_date: new Date().toLocaleDateString('sv-SE'),
        due_date: new Date().toLocaleDateString('sv-SE'),
        payment_status: 'pending'
    });

    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [financialForm, setFinancialForm] = useState<Partial<FinancialEntry> & { isRecurring?: boolean; recurrenceCount?: number }>({
        type: 'payable',
        due_date: new Date().toLocaleDateString('sv-SE'),
        entry_date: new Date().toLocaleDateString('sv-SE'),
        status: 'pending',
        payment_method: 'cash',
        installments_total: 1,
        isRecurring: false,
        recurrenceCount: 2
    });

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [accountForm, setAccountForm] = useState<Partial<BankAccount>>({ balance: 0 });

    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [cardForm, setCardForm] = useState<Partial<CreditCard>>({ limit_amount: 0, current_balance: 0 });

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryForm, setCategoryForm] = useState<Partial<FinancialCategory>>({ type: 'expense' });

    const [isResellerModalOpen, setIsResellerModalOpen] = useState(false);
    const [resellerForm, setResellerForm] = useState<Partial<Reseller>>({ commission_rate: 20 });

    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementForm, setMovementForm] = useState<Partial<InventoryMovement>>({
        type: 'purchase',
        quantity: 0,
        unit_cost: 0,
        movement_date: new Date().toLocaleDateString('sv-SE'),
        expiration_date: ''
    });

    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
    const [selectedResellerForClosing, setSelectedResellerForClosing] = useState<Reseller | null>(null);

    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());

    const [cashFlowMode, setCashFlowMode] = useState<'daily' | 'monthly'>('daily');
    const [cfBaseDate, setCfBaseDate] = useState<Date>(new Date());
    const [expandedCFGroups, setExpandedCFGroups] = useState<Set<string>>(new Set());

    const [financeViewMode, setFinanceViewMode] = useState<'dashboard' | 'list'>('dashboard');
    const [financialFilters, setFinancialFilters] = useState({
        startDate: '',
        endDate: '',
        dateType: 'due_date' as 'due_date' | 'entry_date',
        category_id: '',
        bank_account_id: '',
        payment_method: '',
        status: '',
        search: ''
    });

    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [bulkEditForm, setBulkEditForm] = useState({
        sale_date: '',
        due_date: '',
        payment_status: '',
        reseller_id: '',
        updateSaleDate: false,
        updateDueDate: false,
        updateStatus: false,
        updateReseller: false
    });

    const [salesFilters, setSalesFilters] = useState({
        startDate: '',
        endDate: '',
        dateType: 'sale_date' as 'sale_date' | 'due_date',
        productId: '',
        clientId: '',
        resellerId: '',
        minAmount: '',
        maxAmount: '',
        status: '',
        search: ''
    });

    const [hoveredProduct, setHoveredProduct] = useState<any>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [expandedDreRow, setExpandedDreRow] = useState<string | null>(null);

    const dreData = useMemo(() => {
        const periodSales = sales.filter(s => {
            const d = new Date(s.sale_date);
            return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
        });

        const periodCosts = periodSales.reduce((acc, s) => {
            const prod = products.find(p => p.id === s.product_id);
            return acc + (s.quantity * (prod?.cost_price || 0));
        }, 0);

        // Revenue details
        const revenueDetails = periodSales.map(s => ({
            id: s.id,
            date: s.sale_date,
            description: products.find(p => p.id === s.product_id)?.name || 'Produto',
            amount: s.total_price || 0,
            quantity: s.quantity
        }));

        // CPV details
        const cpvDetails = periodSales.map(s => {
            const prod = products.find(p => p.id === s.product_id);
            return {
                id: s.id,
                date: s.sale_date,
                description: `Custo: ${prod?.name || 'Produto'}`,
                amount: s.quantity * (prod?.cost_price || 0),
                quantity: s.quantity
            };
        });

        const grossRevenue = periodSales.reduce((acc, s) => acc + (s.total_price || 0), 0);
        const cancellations = 0; // Placeholder
        const netRevenue = grossRevenue - cancellations;
        const contributionMargin = netRevenue - periodCosts;

        const fixedCategories = ['Aluguel', 'Energia', 'Internet', 'Salários', 'Pró-labore', 'Seguros'];
        const taxCategories = ['Impostos', 'DAS', 'Taxas'];
        const feeCategories = ['Tarifas', 'Tarifa C/c', 'Outras Tarifas'];

        const periodEntries = financialEntries.filter(e => {
            const date = new Date(e.due_date);
            return date.getMonth() === filterMonth && date.getFullYear() === filterYear;
        });

        const fixedEntriesRaw = periodEntries
            .filter(e => {
                if (e.type !== 'payable') return false;
                const cat = categories.find(c => c.id === (e as any).category_id);
                return fixedCategories.includes(cat?.name || '');
            });

        const fixedExpenses = fixedEntriesRaw.reduce((acc, e) => acc + e.amount, 0);
        const fixedDetails = fixedEntriesRaw.map(e => ({
            id: e.id,
            date: e.due_date,
            description: e.description,
            amount: e.amount,
            category: categories.find(c => c.id === (e as any).category_id)?.name
        }));

        const taxEntriesRaw = periodEntries
            .filter(e => {
                if (e.type !== 'payable') return false;
                const cat = categories.find(c => c.id === (e as any).category_id);
                return taxCategories.includes(cat?.name || '');
            });

        const taxes = taxEntriesRaw.reduce((acc, e) => acc + e.amount, 0);
        const taxDetails = taxEntriesRaw.map(e => ({
            id: e.id,
            date: e.due_date,
            description: e.description,
            amount: e.amount,
            category: categories.find(c => c.id === (e as any).category_id)?.name
        }));

        const feeEntriesRaw = periodEntries
            .filter(e => {
                if (e.type !== 'payable') return false;
                const cat = categories.find(c => c.id === (e as any).category_id);
                return feeCategories.includes(cat?.name || '');
            });

        const manualFees = feeEntriesRaw.reduce((acc, e) => acc + e.amount, 0);
        const cardFeesTotal = periodSales.reduce((acc, s) => acc + (s.card_fee_amount || 0), 0);
        const fees = manualFees + cardFeesTotal;

        const manualFeeDetails = feeEntriesRaw.map(e => ({
            id: e.id,
            date: e.due_date,
            description: e.description,
            amount: e.amount,
            category: categories.find(c => c.id === (e as any).category_id)?.name
        }));

        const cardFeeDetails = periodSales
            .filter(s => (s.card_fee_amount || 0) > 0)
            .map(s => ({
                id: `card-fee-${s.id}`,
                date: s.sale_date,
                description: `Taxa Cartão: Venda #${s.id.slice(0, 8)} (${s.card_brand})`,
                amount: s.card_fee_amount || 0
            }));

        const feeDetails = [...manualFeeDetails, ...cardFeeDetails];

        // Commission details from sales
        const commissions = periodSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0);
        const commissionDetails = periodSales
            .filter(s => s.discount_amount > 0)
            .map(s => ({
                id: s.id,
                date: s.sale_date,
                description: `Comissão: ${resellers.find(r => r.id === s.reseller_id)?.name || 'Vendedor'}`,
                amount: s.discount_amount || 0
            }));

        const variableEntriesRaw = periodEntries
            .filter(e => {
                if (e.type !== 'payable') return false;
                const cat = categories.find(c => c.id === (e as any).category_id);
                return !fixedCategories.includes(cat?.name || '') &&
                    !taxCategories.includes(cat?.name || '') &&
                    !feeCategories.includes(cat?.name || '') &&
                    cat?.name !== 'Forn Produtos';
            });

        const variableExpenses = variableEntriesRaw.reduce((acc, e) => acc + e.amount, 0);
        const variableDetails = variableEntriesRaw.map(e => ({
            id: e.id,
            date: e.due_date,
            description: e.description,
            amount: e.amount,
            category: categories.find(c => c.id === (e as any).category_id)?.name
        }));

        const operationalProfit = contributionMargin - fixedExpenses;
        const netProfit = operationalProfit - taxes - fees - commissions - variableExpenses;

        return {
            grossRevenue,
            revenueDetails,
            cancellations,
            netRevenue,
            cpv: periodCosts,
            cpvDetails,
            contributionMargin,
            fixedExpenses,
            fixedDetails,
            operationalProfit,
            taxes,
            taxDetails,
            fees,
            feeDetails,
            commissions,
            commissionDetails,
            variableExpenses,
            variableDetails,
            netProfit
        };
    }, [sales, financialEntries, products, categories, filterMonth, filterYear, resellers]);

    const inventoryAlerts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const in15Days = new Date();
        in15Days.setDate(today.getDate() + 15);
        in15Days.setHours(23, 59, 59, 999);

        const expired = products.filter(p => (p.stock_quantity || 0) > 0 && p.expiration_date && new Date(p.expiration_date + 'T23:59:59') < today);
        const expiringSoon = products.filter(p =>
            (p.stock_quantity || 0) > 0 &&
            p.expiration_date &&
            new Date(p.expiration_date + 'T00:00:00') >= today &&
            new Date(p.expiration_date + 'T23:59:59') <= in15Days
        );

        return { expired, expiringSoon };
    }, [products]);

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatPercent = (val: number, base: number) => base === 0 ? '0.00%' : `${((val / base) * 100).toFixed(2)}%`;

    const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const getFilteredSales = () => {
        return sales.filter(s => {
            if (salesFilters.startDate && s[salesFilters.dateType] < salesFilters.startDate) return false;
            if (salesFilters.endDate && s[salesFilters.dateType] > salesFilters.endDate) return false;
            if (salesFilters.productId && s.product_id !== salesFilters.productId) return false;
            if (salesFilters.clientId && s.client_id !== salesFilters.clientId) return false;
            if (salesFilters.resellerId && s.reseller_id !== salesFilters.resellerId) return false;
            if (salesFilters.status && s.payment_status !== salesFilters.status) return false;
            if (salesFilters.minAmount && s.net_amount < parseFloat(salesFilters.minAmount)) return false;
            if (salesFilters.maxAmount && s.net_amount > parseFloat(salesFilters.maxAmount)) return false;

            if (salesFilters.search) {
                const search = salesFilters.search.toLowerCase();
                const product = products.find(p => p.id === s.product_id);
                const client = registrations.find(c => c.id === s.client_id);
                const reseller = resellers.find(r => r.id === s.reseller_id);

                return (
                    product?.name.toLowerCase().includes(search) ||
                    client?.name.toLowerCase().includes(search) ||
                    reseller?.name.toLowerCase().includes(search) ||
                    s.id.toLowerCase().includes(search)
                );
            }
            return true;
        });
    };

    // Check current session
    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (!selectedCardId && creditCards.length > 0) {
            setSelectedCardId(creditCards[0].id);
        }
    }, [creditCards]);

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

    // --- Automatic Sale Calculations ---
    useEffect(() => {
        if (!isSaleModalOpen) return;

        const product = products.find(p => p.id === saleForm.product_id);
        const unitPrice = saleForm.unit_price || product?.price || 0;
        const gross = unitPrice * (saleForm.quantity || 1);

        const discPerc = saleForm.discount_percentage || 0;
        const discAmt = gross * (discPerc / 100);
        const amountAfterDiscount = gross - discAmt;

        let feePercent = 0;
        if (saleForm.payment_method?.includes('cartão')) {
            let methodKey: 'debit' | 'credit_cash' | 'credit_installments' = 'credit_cash';
            if (saleForm.payment_method === 'cartão_débito') {
                methodKey = 'debit';
            } else if ((saleForm.installments || 1) > 1) {
                methodKey = 'credit_installments';
            }

            const fee = paymentFees.find(f => f.brand === saleForm.card_brand && f.method === methodKey);
            feePercent = fee?.fee_percentage || 0;
        }

        const feeAmt = amountAfterDiscount * (feePercent / 100);
        const finalNet = amountAfterDiscount - feeAmt;

        // Check if values actually changed to avoid infinite loop
        if (
            saleForm.total_price !== gross ||
            saleForm.discount_amount !== discAmt ||
            saleForm.card_fee_percent !== feePercent ||
            saleForm.card_fee_amount !== feeAmt ||
            saleForm.net_amount !== finalNet ||
            saleForm.unit_price !== unitPrice
        ) {
            setSaleForm(prev => ({
                ...prev,
                unit_price: unitPrice,
                total_price: gross,
                discount_amount: discAmt,
                card_fee_percent: feePercent,
                card_fee_amount: feeAmt,
                net_amount: finalNet
            }));
        }
    }, [
        saleForm.product_id,
        saleForm.quantity,
        saleForm.discount_percentage,
        saleForm.payment_method,
        saleForm.card_brand,
        saleForm.installments,
        isSaleModalOpen,
        products,
        paymentFees
    ]);

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
                { data: cats },
                { data: data_movements },
                { data: fees }
            ] = await Promise.all([
                supabase.from('registrations').select('*').order('created_at', { ascending: false }),
                supabase.from('reminder_settings').select('message_template, media_url').eq('key', 'default').single(),
                supabase.from('products').select('*').order('name'),
                supabase.from('resellers').select('*').order('name'),
                supabase.from('bank_accounts').select('*').order('name'),
                supabase.from('financial_entries').select('*').order('due_date', { ascending: true }),
                supabase.from('sales').select('*').order('sale_date', { ascending: false }),
                supabase.from('credit_cards').select('*').order('name'),
                supabase.from('financial_categories').select('*').order('name'),
                supabase.from('inventory_movements').select('*').order('movement_date', { ascending: false }),
                supabase.from('card_fees').select('*').order('brand')
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
            if (data_movements) setMovements(data_movements);
            if (fees) setPaymentFees(fees);
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

    async function handleUpdateFee(id: string, newPercentage: number) {
        const { error } = await supabase.from('card_fees').update({ fee_percentage: newPercentage }).eq('id', id);
        if (error) showNotification(error.message, 'error');
        else {
            setPaymentFees(prev => prev.map(f => f.id === id ? { ...f, fee_percentage: newPercentage } : f));
            // Sincronização via fetchData opcional se o estado local for atualizado corretamente
            // fetchData(); 
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

    // --- Centralized Sync Logic (FIFO & WAC) ---
    async function syncProductData(productId: string) {
        const { data: movements } = await supabase
            .from('inventory_movements')
            .select('*')
            .eq('product_id', productId)
            .order('movement_date', { ascending: true })
            .order('created_at', { ascending: true });

        if (!movements) return;

        const inflows = movements.filter(m => m.type === 'purchase' || m.type === 'initial');
        const outflows = movements.filter(m => m.type === 'sale' || m.type === 'adjustment');

        const totalIn = inflows.reduce((acc, m) => acc + m.quantity, 0);
        const totalOut = outflows.reduce((acc, m) => acc + m.quantity, 0);
        const finalStock = Math.max(0, totalIn - totalOut);

        // 1. Calculate Weighted Average Cost (WAC)
        let totalValue = 0;
        let totalQtyIn = 0;
        inflows.forEach(m => {
            totalValue += m.quantity * (m.unit_cost || 0);
            totalQtyIn += m.quantity;
        });
        const finalCost = totalQtyIn > 0 ? totalValue / totalQtyIn : 0;

        // 2. Calculate Active Expiration (FIFO)
        let remainingOut = totalOut;
        let activeExp = null;
        for (const m of inflows) {
            if (remainingOut >= m.quantity) {
                remainingOut -= m.quantity;
            } else {
                activeExp = m.expiration_date;
                break;
            }
        }

        await supabase.from('products').update({
            stock_quantity: finalStock,
            cost_price: finalCost,
            expiration_date: activeExp
        }).eq('id', productId);
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

            if (!error && (editingProduct.initial_stock || 0) > 0) {
                await supabase.from('inventory_movements').insert([{
                    product_id: editingProduct.id,
                    type: 'initial',
                    quantity: editingProduct.initial_stock,
                    unit_cost: editingProduct.cost_price || 0,
                    movement_date: editingProduct.initial_stock_date || new Date().toISOString().split('T')[0],
                    expiration_date: editingProduct.expiration_date,
                    reason: 'Estoque Inicial'
                }]);
                await syncProductData(editingProduct.id!);
            }
        }

        if (error) showNotification(`Erro ao salvar produto: ${error.message}`, 'error');
        else {
            showNotification('Produto salvo com sucesso!');
            setIsProductModalOpen(false);
            setEditingProduct(null);
            fetchData();
        }
    }
    async function handleSaveMovement(e: React.FormEvent) {
        e.preventDefault();
        if (!movementForm.product_id || (movementForm.quantity || 0) <= 0) {
            showNotification('Preencha os campos obrigatórios!', 'error');
            return;
        }

        const product = products.find(p => p.id === movementForm.product_id);
        if (!product) return;

        setLoading(true);
        try {
            // 1. Inserir movimentação
            const { error: movError } = await supabase.from('inventory_movements').insert([movementForm]);
            if (movError) throw movError;

            // 2. Sincronizar Produto (WAC & FIFO)
            await syncProductData(product.id);

            showNotification('Movimentação registrada com sucesso!');
            setIsMovementModalOpen(false);
            fetchData();
        } catch (err: any) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
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
        if (!saleForm.product_id || !saleForm.quantity || !saleForm.total_price) {
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

                    const newStock = product.stock_quantity - (saleForm.quantity || 0);
                    const updatePayload: any = { stock_quantity: newStock };
                    if (newStock <= 0) updatePayload.expiration_date = null;

                    await supabase.from('products').update(updatePayload).eq('id', product.id);
                }

                const { error: updError } = await supabase.from('sales').update({
                    product_id: saleForm.product_id,
                    reseller_id: saleForm.reseller_id,
                    client_id: saleForm.client_id,
                    quantity: saleForm.quantity,
                    unit_price: saleForm.unit_price,
                    total_price: saleForm.total_price,
                    discount_percentage: saleForm.discount_percentage,
                    discount_amount: saleForm.discount_amount,
                    net_amount: saleForm.net_amount,
                    sale_date: saleForm.sale_date,
                    due_date: saleForm.due_date,
                    payment_status: saleForm.payment_status,
                    payment_method: saleForm.payment_method,
                    installments: saleForm.installments,
                    card_brand: saleForm.card_brand,
                    card_fee_percent: saleForm.card_fee_percent,
                    card_fee_amount: saleForm.card_fee_amount
                }).eq('id', saleForm.id);
                if (updError) { showNotification(updError.message, 'error'); return; }

                // Update the corresponding financial entry
                const saleCategory = categories.find(c => c.name.toLowerCase().includes('venda de produtos'));
                await supabase.from('financial_entries')
                    .update({
                        amount: saleForm.net_amount,
                        due_date: saleForm.due_date,
                        entry_date: saleForm.sale_date,
                        status: saleForm.payment_status,
                        category: saleCategory?.name || 'Venda de Produtos',
                        category_id: saleCategory?.id,
                        description: `Venda #${saleForm.id.slice(0, 8)} - ${product.name} (Editado)`
                    })
                    .eq('sale_id', saleForm.id);

                // Sincronizar dados de estoque e validade
                await supabase.from('inventory_movements')
                    .update({
                        product_id: saleForm.product_id,
                        quantity: saleForm.quantity,
                        movement_date: saleForm.sale_date
                    })
                    .eq('sale_id', saleForm.id);

                await syncProductData(oldSale.product_id);
                if (oldSale.product_id !== saleForm.product_id) {
                    await syncProductData(saleForm.product_id);
                }
            }
        } else {
            // New sale
            if (product.stock_quantity < (saleForm.quantity || 0)) {
                showNotification('Estoque insuficiente para esta venda!', 'error');
                return;
            }

            const { data: sale, error: slsError } = await supabase.from('sales').insert([{
                product_id: saleForm.product_id,
                reseller_id: saleForm.reseller_id,
                client_id: saleForm.client_id,
                quantity: saleForm.quantity,
                unit_price: saleForm.unit_price,
                total_price: saleForm.total_price,
                discount_percentage: saleForm.discount_percentage,
                discount_amount: saleForm.discount_amount,
                net_amount: saleForm.net_amount,
                sale_date: saleForm.sale_date,
                due_date: saleForm.due_date,
                payment_status: saleForm.payment_status,
                payment_method: saleForm.payment_method,
                installments: saleForm.installments,
                card_brand: saleForm.card_brand,
                card_fee_percent: saleForm.card_fee_percent,
                card_fee_amount: saleForm.card_fee_amount
            }]).select().single();
            if (slsError) { showNotification(`Erro na venda: ${slsError.message}`, 'error'); return; }

            // Registrar saída no estoque (FIFO)
            await supabase.from('inventory_movements').insert([{
                product_id: saleForm.product_id,
                type: 'sale',
                quantity: saleForm.quantity,
                movement_date: saleForm.sale_date,
                sale_id: sale.id,
                reason: `Venda #${sale.id.slice(0, 8)}`
            }]);

            await syncProductData(saleForm.product_id);

            // Create financial entry
            const saleCategory = categories.find(c => c.name.toLowerCase().includes('venda de produtos'));
            await supabase.from('financial_entries').insert([{
                type: 'receivable',
                description: `Venda #${sale.id.slice(0, 8)} - ${product.name}`,
                amount: saleForm.net_amount,
                due_date: saleForm.due_date || new Date().toLocaleDateString('sv-SE'),
                entry_date: saleForm.sale_date || new Date().toLocaleDateString('sv-SE'),
                status: saleForm.payment_status || 'pending',
                category: saleCategory?.name || 'Venda de Produtos',
                category_id: saleCategory?.id,
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
                // Recalcular produto após exclusão (o cascade apagará o movimento)
                const sale = sales.find(s => s.id === id);
                if (!sale) return;

                const productId = sale.product_id;

                // Delete associated financial entry
                await supabase.from('financial_entries').delete().eq('sale_id', id);

                // Delete sale
                const { error } = await supabase.from('sales').delete().eq('id', id);
                if (error) showNotification(`Erro ao excluir: ${error.message}`, 'error');
                else {
                    await syncProductData(productId);
                    showNotification('Venda e registros associados removidos.');
                    fetchData();
                }
            }
        );
    }

    async function handleBulkDeleteSales() {
        if (selectedSales.size === 0) return;
        askConfirmation(
            'Excluir Vendas',
            `Deseja excluir permanentemente as ${selectedSales.size} vendas selecionadas? O estoque será restaurado automaticamente.`,
            async () => {
                const saleIds = Array.from(selectedSales);

                // Restore stock for all selected sales
                for (const id of saleIds) {
                    const sale = sales.find(s => s.id === id);
                    if (sale) {
                        const product = products.find(p => p.id === sale.product_id);
                        if (product) {
                            await supabase.from('products').update({ stock_quantity: product.stock_quantity + sale.quantity }).eq('id', product.id);
                        }
                    }
                }

                // Delete associated financial entries
                await supabase.from('financial_entries').delete().in('sale_id', saleIds);

                const { error } = await supabase.from('sales').delete().in('id', saleIds);
                if (error) showNotification(`Erro ao excluir vendas: ${error.message}`, 'error');
                else {
                    showNotification(`${saleIds.length} vendas removidas com sucesso!`);
                    setSelectedSales(new Set());
                    fetchData();
                }
            }
        );
    }

    async function handleBulkEditSales() {
        if (selectedSales.size === 0) return;

        const updates: any = {};
        if (bulkEditForm.updateSaleDate && bulkEditForm.sale_date) {
            updates.sale_date = bulkEditForm.sale_date;
        }
        if (bulkEditForm.updateDueDate && bulkEditForm.due_date) {
            updates.due_date = bulkEditForm.due_date;
        }
        if (bulkEditForm.updateStatus && bulkEditForm.payment_status) {
            updates.payment_status = bulkEditForm.payment_status;
        }
        if (bulkEditForm.updateReseller) {
            updates.reseller_id = bulkEditForm.reseller_id || null;
        }

        if (Object.keys(updates).length === 0) {
            showNotification('Selecione pelo menos um campo para alterar!', 'error');
            return;
        }

        try {
            const saleIds = Array.from(selectedSales);

            // Update sales
            const { error } = await supabase.from('sales').update(updates).in('id', saleIds);
            if (error) throw error;

            // Update associated financial entries if due_date or status changed
            if (updates.due_date || updates.payment_status) {
                const financialUpdates: any = {};
                if (updates.due_date) financialUpdates.due_date = updates.due_date;
                if (updates.payment_status) financialUpdates.status = updates.payment_status;

                await supabase.from('financial_entries').update(financialUpdates).in('sale_id', saleIds);
            }

            showNotification(`${saleIds.length} vendas atualizadas com sucesso!`);
            setIsBulkEditModalOpen(false);
            setSelectedSales(new Set());
            setBulkEditForm({
                sale_date: '',
                due_date: '',
                payment_status: '',
                reseller_id: '',
                updateSaleDate: false,
                updateDueDate: false,
                updateStatus: false,
                updateReseller: false
            });
            fetchData();
        } catch (error: any) {
            showNotification(`Erro ao atualizar vendas: ${error.message}`, 'error');
        }
    }

    // --- Export Sales Functions ---
    function exportSalesToExcel() {
        const filteredSales = getFilteredSales();
        if (filteredSales.length === 0) {
            showNotification('Nenhuma venda para exportar!', 'error');
            return;
        }

        // Helper to format numbers with 2 decimal places
        const formatNum = (value: number) => parseFloat((value || 0).toFixed(2));

        const data = filteredSales.map(s => ({
            'Data Venda': formatDate(s.sale_date),
            'Data Vencimento': formatDate(s.due_date),
            'Produto': products.find(p => p.id === s.product_id)?.name || '-',
            'Cliente': registrations.find(c => c.id === s.client_id)?.name || '-',
            'Vendedor': resellers.find(r => r.id === s.reseller_id)?.name || 'Venda Direta',
            'Qtd': s.quantity,
            'Valor Unit.': formatNum(s.unit_price),
            'Total Bruto': formatNum(s.total_price),
            'Desconto/Comissão': formatNum(s.discount_amount),
            'Líquido': formatNum(s.net_amount),
            'Status': s.payment_status === 'paid' ? 'Pago' : s.payment_status === 'pending' ? 'Pendente' : 'Atrasado'
        }));

        // Add totals row
        const totals = {
            'Data Venda': '',
            'Data Vencimento': '',
            'Produto': '',
            'Cliente': '',
            'Vendedor': 'TOTAIS',
            'Qtd': filteredSales.reduce((acc, s) => acc + s.quantity, 0),
            'Valor Unit.': '',
            'Total Bruto': formatNum(filteredSales.reduce((acc, s) => acc + (s.total_price || 0), 0)),
            'Desconto/Comissão': formatNum(filteredSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0)),
            'Líquido': formatNum(filteredSales.reduce((acc, s) => acc + (s.net_amount || 0), 0)),
            'Status': ''
        };
        data.push(totals);

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

        const fileName = `vendas_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showNotification(`Exportado ${filteredSales.length} vendas para Excel!`);
    }

    function exportSalesToPDF() {
        const filteredSales = getFilteredSales();
        if (filteredSales.length === 0) {
            showNotification('Nenhuma venda para exportar!', 'error');
            return;
        }

        const doc = new jsPDF('landscape');

        // Load and add logo
        const logoUrl = '/assets/logo.png';
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = logoUrl;

        img.onload = () => {
            // Add logo
            doc.addImage(img, 'PNG', 14, 8, 30, 30);

            // Header - positioned after logo
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Relatório de Vendas', 50, 18);

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('Nutrabene - Nutrição Inteligente', 50, 26);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 50, 34);

            // Filters info
            let filterInfo = 'Filtros: ';
            if (salesFilters.startDate) filterInfo += `De ${formatDate(salesFilters.startDate)} `;
            if (salesFilters.endDate) filterInfo += `Até ${formatDate(salesFilters.endDate)} `;
            if (salesFilters.productId) filterInfo += `| Produto: ${products.find(p => p.id === salesFilters.productId)?.name} `;
            if (salesFilters.resellerId) filterInfo += `| Vendedor: ${resellers.find(r => r.id === salesFilters.resellerId)?.name} `;
            if (salesFilters.status) filterInfo += `| Status: ${salesFilters.status === 'paid' ? 'Pago' : 'Pendente'} `;
            if (filterInfo === 'Filtros: ') filterInfo = 'Filtros: Todos';
            doc.setFontSize(8);
            doc.text(filterInfo, 14, 44);

            // Helper function for currency formatting (Brazilian format: R$ 1.234,56)
            const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Table data
            const tableData = filteredSales.map(s => [
                formatDate(s.sale_date),
                formatDate(s.due_date),
                products.find(p => p.id === s.product_id)?.name || '-',
                resellers.find(r => r.id === s.reseller_id)?.name || 'Direta',
                s.quantity.toString(),
                formatCurrency(s.total_price || 0),
                formatCurrency(s.discount_amount || 0),
                formatCurrency(s.net_amount || 0),
                s.payment_status === 'paid' ? 'Pago' : 'Pendente'
            ]);

            // Add totals
            const totalBruto = filteredSales.reduce((acc, s) => acc + (s.total_price || 0), 0);
            const totalDesconto = filteredSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0);
            const totalLiquido = filteredSales.reduce((acc, s) => acc + (s.net_amount || 0), 0);
            const totalQtd = filteredSales.reduce((acc, s) => acc + s.quantity, 0);

            tableData.push([
                '', '', '', 'TOTAIS',
                totalQtd.toString(),
                formatCurrency(totalBruto),
                formatCurrency(totalDesconto),
                formatCurrency(totalLiquido),
                ''
            ]);

            autoTable(doc, {
                startY: 50,
                head: [['Data Venda', 'Vencimento', 'Produto', 'Vendedor', 'Qtd', 'Bruto', 'Desc/Com', 'Líquido', 'Status']],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [139, 169, 130], fontStyle: 'bold' }, // Verde da marca
                alternateRowStyles: { fillColor: [248, 250, 252] },
                foot: [],
                didParseCell: function (data) {
                    // Style totals row
                    if (data.row.index === tableData.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [226, 232, 240];
                    }
                }
            });

            doc.save(`vendas_${new Date().toISOString().split('T')[0]}.pdf`);
            showNotification(`Exportado ${filteredSales.length} vendas para PDF!`);
        };

        img.onerror = () => {
            // Fallback without logo
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Relatório de Vendas - Nutrabene', 14, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

            let filterInfo = 'Filtros: ';
            if (salesFilters.startDate) filterInfo += `De ${formatDate(salesFilters.startDate)} `;
            if (salesFilters.endDate) filterInfo += `Até ${formatDate(salesFilters.endDate)} `;
            if (salesFilters.productId) filterInfo += `| Produto: ${products.find(p => p.id === salesFilters.productId)?.name} `;
            if (salesFilters.resellerId) filterInfo += `| Vendedor: ${resellers.find(r => r.id === salesFilters.resellerId)?.name} `;
            if (salesFilters.status) filterInfo += `| Status: ${salesFilters.status === 'paid' ? 'Pago' : 'Pendente'} `;
            if (filterInfo === 'Filtros: ') filterInfo = 'Filtros: Todos';
            doc.setFontSize(8);
            doc.text(filterInfo, 14, 34);

            const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const tableData = filteredSales.map(s => [
                formatDate(s.sale_date),
                formatDate(s.due_date),
                products.find(p => p.id === s.product_id)?.name || '-',
                resellers.find(r => r.id === s.reseller_id)?.name || 'Direta',
                s.quantity.toString(),
                formatCurrency(s.total_price || 0),
                formatCurrency(s.discount_amount || 0),
                formatCurrency(s.net_amount || 0),
                s.payment_status === 'paid' ? 'Pago' : 'Pendente'
            ]);

            const totalBruto = filteredSales.reduce((acc, s) => acc + (s.total_price || 0), 0);
            const totalDesconto = filteredSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0);
            const totalLiquido = filteredSales.reduce((acc, s) => acc + (s.net_amount || 0), 0);
            const totalQtd = filteredSales.reduce((acc, s) => acc + s.quantity, 0);

            tableData.push([
                '', '', '', 'TOTAIS',
                totalQtd.toString(),
                formatCurrency(totalBruto),
                formatCurrency(totalDesconto),
                formatCurrency(totalLiquido),
                ''
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Data Venda', 'Vencimento', 'Produto', 'Vendedor', 'Qtd', 'Bruto', 'Desc/Com', 'Líquido', 'Status']],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [139, 169, 130], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                foot: [],
                didParseCell: function (data) {
                    if (data.row.index === tableData.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [226, 232, 240];
                    }
                }
            });

            doc.save(`vendas_${new Date().toISOString().split('T')[0]}.pdf`);
            showNotification(`Exportado ${filteredSales.length} vendas para PDF!`);
        };
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

                // Sincroniza com a venda se houver vínculo
                if (oldEntry?.sale_id) {
                    const saleUpdates: any = {};
                    if (updateData.status) saleUpdates.payment_status = updateData.status;
                    if (updateData.due_date) saleUpdates.due_date = updateData.due_date;
                    if (updateData.entry_date) saleUpdates.sale_date = updateData.entry_date;

                    if (Object.keys(saleUpdates).length > 0) {
                        await supabase.from('sales').update(saleUpdates).eq('id', oldEntry.sale_id);
                    }
                }

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
                // Create New (handle installments if credit card OR recurrence)
                const installments = entryData.payment_method === 'credit_card' ? (entryData.installments_total || 1) : 1;
                const isRecurring = financialForm.isRecurring && financialForm.recurrenceCount && financialForm.recurrenceCount > 1;
                const recurrenceCount = isRecurring ? financialForm.recurrenceCount : 1;

                const baseAmount = entryData.amount;
                const installmentAmount = parseFloat((baseAmount / installments).toFixed(2));
                const entriesToInsert = [];

                // If recurring, create multiple entries each 30 days apart
                if (isRecurring) {
                    for (let r = 0; r < recurrenceCount!; r++) {
                        const [y, m, d] = (entryData.due_date || new Date().toLocaleDateString('sv-SE')).split('-').map(Number);
                        const [ey, em, ed] = (entryData.entry_date || new Date().toLocaleDateString('sv-SE')).split('-').map(Number);

                        const dueDate = new Date(y, m - 1, d);
                        const entryDate = new Date(ey, em - 1, ed);

                        // Add 30 days for each recurrence
                        dueDate.setDate(dueDate.getDate() + (30 * r));
                        entryDate.setDate(entryDate.getDate() + (30 * r));

                        const finalDueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
                        const finalEntryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;

                        // Remove recurrence fields before inserting
                        const { isRecurring: _, recurrenceCount: __, ...cleanEntry } = entryData as any;

                        entriesToInsert.push({
                            ...cleanEntry,
                            bank_account_id: bankId,
                            amount: baseAmount,
                            due_date: finalDueDateStr,
                            entry_date: finalEntryDateStr,
                            description: `${entryData.description} (${r + 1}/${recurrenceCount})`
                        });
                    }
                } else {
                    // Normal flow with installments (for credit card)
                    for (let i = 1; i <= installments; i++) {
                        const [y, m, d] = (entryData.due_date || new Date().toLocaleDateString('sv-SE')).split('-').map(Number);
                        const dueDate = new Date(y, m - 1, d);
                        if (i > 1) {
                            dueDate.setMonth(dueDate.getMonth() + (i - 1));
                        }
                        const finalDueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

                        // Remove recurrence fields before inserting
                        const { isRecurring: _, recurrenceCount: __, ...cleanEntry } = entryData as any;

                        entriesToInsert.push({
                            ...cleanEntry,
                            bank_account_id: bankId,
                            amount: i === installments ? parseFloat((baseAmount - (installmentAmount * (installments - 1))).toFixed(2)) : installmentAmount,
                            due_date: finalDueDateStr,
                            installment_number: i,
                            installments_total: installments,
                            description: installments > 1 ? `${entryData.description} (${i}/${installments})` : entryData.description
                        });
                    }
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

        if (entryError) {
            showNotification(`Erro ao liquidar: ${entryError.message}`, 'error');
        } else {
            // Se houver uma venda vinculada, atualiza o status dela também
            if (entry.sale_id) {
                await supabase.from('sales').update({ payment_status: 'paid' }).eq('id', entry.sale_id);
            }
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
                    setSelectedEntries(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    fetchData();
                }
            }
        );
    }

    async function handleBulkDelete() {
        if (selectedEntries.size === 0) return;
        askConfirmation(
            'Excluir Lançamentos',
            `Deseja excluir permanentemente os ${selectedEntries.size} lançamentos selecionados?`,
            async () => {
                const { error } = await supabase.from('financial_entries').delete().in('id', Array.from(selectedEntries));
                if (error) showNotification(`Erro ao excluir: ${error.message}`, 'error');
                else {
                    showNotification(`${selectedEntries.size} lançamentos excluídos com sucesso!`);
                    setSelectedEntries(new Set());
                    fetchData();
                }
            }
        );
    }

    async function handleBulkMarkAsPaid() {
        if (selectedEntries.size === 0) return;

        const entriesToUpdate = financialEntries.filter(e => selectedEntries.has(e.id) && e.status !== 'paid');
        if (entriesToUpdate.length === 0) {
            showNotification('Nenhum lançamento pendente selecionado.', 'error');
            return;
        }

        askConfirmation(
            'Liquidar Lançamentos',
            `Deseja marcar como pago os ${entriesToUpdate.length} lançamentos pendentes selecionados?`,
            async () => {
                let successCount = 0;
                let errorCount = 0;

                // Clone bank accounts to track local balance changes during the loop
                const localBankBalances = new Map<string, number>(bankAccounts.map(b => [b.id, b.balance]));

                for (const entry of entriesToUpdate) {
                    try {
                        const bankId = entry.bank_account_id || bankAccounts[0]?.id;
                        if (!bankId) throw new Error('Conta bancária não configurada');

                        const currentBalance = localBankBalances.get(bankId);
                        if (currentBalance === undefined) throw new Error('Conta bancária não encontrada');

                        const newBalance = entry.type === 'receivable' ? currentBalance + entry.amount : currentBalance - entry.amount;

                        // Update bank in DB
                        const { error: bankErr } = await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', bankId);
                        if (bankErr) throw bankErr;

                        // Update local tracker
                        localBankBalances.set(bankId, newBalance);

                        // Update entry in DB
                        const { error: entryErr } = await supabase.from('financial_entries').update({
                            status: 'paid',
                            payment_date: new Date().toISOString().split('T')[0],
                            bank_account_id: bankId
                        }).eq('id', entry.id);

                        if (entryErr) throw entryErr;

                        // Se houver uma venda vinculada, atualiza o status dela também
                        if (entry.sale_id) {
                            await supabase.from('sales').update({ payment_status: 'paid' }).eq('id', entry.sale_id);
                        }

                        successCount++;
                    } catch (err) {
                        console.error(err);
                        errorCount++;
                    }
                }

                if (successCount > 0) showNotification(`${successCount} lançamentos liquidados com sucesso!`);
                if (errorCount > 0) showNotification(`${errorCount} erros ao liquidar.`, 'error');

                setSelectedEntries(new Set());
                fetchData();
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

    const getFilteredFinancialEntries = () => {
        return financialEntries.filter(e => {
            const dateToCompare = financialFilters.dateType === 'entry_date'
                ? (e.entry_date || e.created_at || '').split('T')[0]
                : e.due_date.split('T')[0];

            if (financialFilters.startDate && dateToCompare < financialFilters.startDate) return false;
            if (financialFilters.endDate && dateToCompare > financialFilters.endDate) return false;
            if (financialFilters.category_id && (e as any).category_id !== financialFilters.category_id) return false;
            if (financialFilters.bank_account_id && e.bank_account_id !== financialFilters.bank_account_id) return false;
            if (financialFilters.status && e.status !== financialFilters.status) return false;
            if (financialFilters.payment_method && e.payment_method !== financialFilters.payment_method) return false;
            if (financialFilters.search) {
                const term = financialFilters.search.toLowerCase();
                const desc = e.description.toLowerCase();
                const cat = e.category.toLowerCase();
                if (!desc.includes(term) && !cat.includes(term)) return false;
            }
            return true;
        }).sort((a, b) => b.due_date.localeCompare(a.due_date));
    };

    const getCashFlowMetrics = () => {
        const baseYear = cfBaseDate.getFullYear();
        const baseMonth = String(cfBaseDate.getMonth() + 1).padStart(2, '0');
        const baseDay = String(cfBaseDate.getDate()).padStart(2, '0');
        const baseDateStr = `${baseYear}-${baseMonth}-${baseDay}`;

        const periodStartStr = cashFlowMode === 'daily'
            ? baseDateStr
            : `${baseYear}-${baseMonth}-01`;

        const filteredEntries = financialEntries.filter(e => {
            const entryDateStr = e.due_date.split('T')[0];
            if (cashFlowMode === 'daily') {
                return entryDateStr === baseDateStr;
            } else {
                return entryDateStr.startsWith(`${baseYear}-${baseMonth}`);
            }
        });

        const entriesByGroup = filteredEntries.reduce((acc: any, e) => {
            const catId = (e as any).category_id;
            const category = categories.find(c => c.id === catId);
            const groupKey = catId || 'unassigned';
            if (!acc[groupKey]) {
                acc[groupKey] = {
                    id: groupKey,
                    name: category?.name || 'Sem Categoria',
                    type: category?.type || (e.type === 'receivable' ? 'income' : 'expense'),
                    total: 0,
                    count: 0,
                    entries: []
                };
            }
            acc[groupKey].total += e.amount;
            acc[groupKey].count += 1;
            acc[groupKey].entries.push(e);
            return acc;
        }, {});

        const incomeGroups = Object.values(entriesByGroup).filter((g: any) => g.type === 'income');
        const expenseGroups = Object.values(entriesByGroup).filter((g: any) => g.type === 'expense');

        const totalIncome = filteredEntries.filter(e => e.type === 'receivable').reduce((acc, e) => acc + e.amount, 0);
        const totalExpense = filteredEntries.filter(e => e.type === 'payable').reduce((acc, e) => acc + e.amount, 0);

        const currentBankTotal = bankAccounts.reduce((acc, b) => acc + b.balance, 0);

        // Cumulative & Projected Balance Logic using string comparison for stability
        const netPendingBeforePeriod = financialEntries
            .filter(e => e.status !== 'paid' && e.due_date.split('T')[0] < periodStartStr)
            .reduce((acc, e) => acc + (e.type === 'receivable' ? e.amount : -e.amount), 0);

        const netPaidOnOrAfterPeriod = financialEntries
            .filter(e => e.status === 'paid' && e.due_date.split('T')[0] >= periodStartStr)
            .reduce((acc, e) => acc + (e.type === 'receivable' ? e.amount : -e.amount), 0);

        const initialBalance = currentBankTotal + netPendingBeforePeriod - netPaidOnOrAfterPeriod;

        return {
            filteredEntries,
            incomeGroups,
            expenseGroups,
            totalIncome,
            totalExpense,
            initialBalance
        };
    };

    const getCardMetrics = (cardId: string, month: number, year: number) => {
        const card = creditCards.find(c => c.id === cardId);
        if (!card) return { available: 0, spent: 0, invoiceTotal: 0, invoiceEntries: [], categoryData: {} };

        const unpaidEntries = financialEntries.filter(e => e.credit_card_id === cardId && e.status !== 'paid');
        const spentVal = unpaidEntries.reduce((acc, e) => acc + e.amount, 0);
        const availableVal = Math.max(0, card.limit_amount - spentVal);

        const invoiceEntries = financialEntries.filter(e => {
            if (e.credit_card_id !== cardId) return false;
            const entryDateStr = e.due_date.split('T')[0];
            const [y, m] = entryDateStr.split('-');
            return parseInt(m) - 1 === month && parseInt(y) === year;
        }).sort((a, b) => b.due_date.localeCompare(a.due_date));

        const invoiceTotal = invoiceEntries.reduce((acc, e) => acc + e.amount, 0);

        const categoryData = invoiceEntries.reduce((acc: any, e) => {
            const catId = (e as any).category_id;
            const catName = categories.find(c => c.id === catId)?.name || e.category || 'Outros';
            acc[catName] = (acc[catName] || 0) + e.amount;
            return acc;
        }, {});

        return { available: availableVal, spent: spentVal, invoiceTotal, invoiceEntries, categoryData };
    };

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

    const handleExportPDF = (reseller: Reseller, pendingSales: Sale[], totalGross: number, totalCommission: number, totalNet: number) => {
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
        doc.roundedRect(14, 45, 58, 25, 3, 3);
        doc.roundedRect(76, 45, 58, 25, 3, 3);
        doc.roundedRect(138, 45, 58, 25, 3, 3);

        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text('TOTAL VENDIDO', 20, 52);
        doc.text('TOTAL COMISSÕES', 82, 52);
        doc.text('TOTAL LÍQUIDO', 144, 52);

        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175); // Blue for gross
        doc.text(`R$ ${totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 62);

        doc.setTextColor(217, 119, 6); // Amber for commissions
        doc.text(`R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 82, 62);

        doc.setTextColor(5, 150, 105); // Green for net
        doc.text(`R$ ${totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 144, 62);

        // Table
        const tableData = pendingSales.map(s => [
            formatDate(s.sale_date),
            formatDate(s.due_date),
            products.find(p => p.id === s.product_id)?.name || 'Produto Excluído',
            s.quantity,
            `R$ ${s.unit_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `R$ ${s.total_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `R$ ${s.discount_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `R$ ${s.net_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [['Venda', 'Vencimento', 'Produto', 'Qtd', 'Unitário', 'Total', 'Comissão', 'Líquido']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [30, 64, 175], // Indigo/Blue
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                3: { halign: 'center' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right' }
            },
            bodyStyles: {
                fontSize: 8
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
            case 'dre': return 'equalizer';
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
                        {['dashboard', 'clients', 'inventory', 'sales', 'resellers', 'finances', 'accounts', 'categories', 'dre', 'settings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab as any); setSelectedEntries(new Set()); setSelectedSales(new Set()); }}
                                className={`w-full flex items-center px-4 py-4 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined mr-3">{getTabIcon(tab)}</span>
                                <span className="capitalize">{tab === 'clients' ? 'Clientes' : tab === 'inventory' ? 'Estoque' : tab === 'sales' ? 'Vendas' : tab === 'resellers' ? 'Revendedores' : tab === 'finances' ? 'Financeiro' : tab === 'accounts' ? 'Contas / Cartões' : tab === 'categories' ? 'Categorias' : tab === 'dre' ? 'DRE' : tab === 'settings' ? 'Configurações' : 'Dashboard'}</span>
                                {tab === 'inventory' && (inventoryAlerts.expired.length > 0 || inventoryAlerts.expiringSoon.length > 0) && (
                                    <div className="ml-auto flex gap-1">
                                        {inventoryAlerts.expired.length > 0 && <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>}
                                        {inventoryAlerts.expiringSoon.length > 0 && <span className="h-2 w-2 bg-amber-500 rounded-full"></span>}
                                    </div>
                                )}
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
                                                activeTab === 'finances' ? 'Controle Financeiro' :
                                                    activeTab === 'dre' ? 'Demonstrativo de Resultado' : 'Configurações'}
                        </h1>
                        <p className="text-gray-500 mt-1">Gestão inteligente Nutrabene.</p>
                    </div>

                    {(activeTab === 'dashboard' || activeTab === 'dre') && (
                        <div className="flex space-x-2">
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                                className="bg-white border rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 ring-primary/20 w-36"
                            >
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                className="bg-white border rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 ring-primary/20 w-28"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            {activeTab === 'dashboard' && (
                                <button
                                    onClick={() => handleExportDashboardPDF(filterMonth, filterYear, totalRevenue, totalDiscounts, totalCommissions, finalNet, productRanking)}
                                    className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                >
                                    <span className="material-symbols-outlined text-sm mr-2">picture_as_pdf</span> PDF
                                </button>
                            )}
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
                                <div className="bg-white p-8 rounded-[40px] border shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex flex-col">
                                            <h3 className="text-md font-black text-gray-400 uppercase tracking-widest text-[10px]">Top 10 Produtos</h3>
                                            <h2 className="text-xl font-black text-gray-800">Mais Vendidos</h2>
                                        </div>
                                        <div className="bg-primary/5 px-4 py-2 rounded-2xl">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{filteredSales.length} vendas no total</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6 relative">
                                        {productRanking.length === 0 ? (
                                            <div className="text-center py-20 text-gray-400 font-bold border-2 border-dashed rounded-[40px] bg-gray-50/50">
                                                <span className="material-symbols-outlined text-4xl mb-3 block opacity-20">inventory_2</span>
                                                Nenhuma venda registrada neste período.
                                            </div>
                                        ) : (
                                            productRanking.slice(0, 10).map((p, idx) => {
                                                const maxSold = productRanking[0]?.sold || 1;
                                                const percentage = (p.sold / maxSold) * 100;

                                                return (
                                                    <div key={p.id} className="group flex items-center gap-4">
                                                        <div className="w-32 text-right shrink-0">
                                                            <p className="text-[10px] font-black text-gray-800 uppercase leading-tight truncate" title={p.name}>
                                                                {p.name}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase">
                                                                {p.sold} unidades
                                                            </p>
                                                        </div>
                                                        <div
                                                            className="flex-1 h-10 bg-gray-50 rounded-xl overflow-hidden relative border border-gray-100/50 group-hover:border-primary/20 transition-all cursor-crosshair"
                                                            onMouseEnter={() => setHoveredProduct(p)}
                                                            onMouseLeave={() => setHoveredProduct(null)}
                                                            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                                        >
                                                            <div
                                                                className="h-full bg-primary rounded-r-xl transition-all duration-1000 ease-out relative group-hover:brightness-110 shadow-lg shadow-primary/10"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    background: `linear-gradient(90deg, #7c3aed, #4f46e5)`
                                                                }}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}

                                        {/* Floating Tooltip */}
                                        {hoveredProduct && (
                                            <div
                                                className="fixed z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-[110%] transition-opacity"
                                                style={{
                                                    left: mousePos.x,
                                                    top: mousePos.y
                                                }}
                                            >
                                                <div className="bg-[#1a1f2e] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md min-w-[220px]">
                                                    <p className="text-white font-black text-xs uppercase leading-tight mb-2">
                                                        {hoveredProduct.name}
                                                    </p>
                                                    <div className="h-px bg-white/10 w-full mb-2"></div>
                                                    <p className="text-primary-light font-bold text-[10px] uppercase flex items-center justify-between">
                                                        <span>Total Vendido:</span>
                                                        <span className="text-white">R$ {hoveredProduct.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </p>
                                                </div>
                                            </div>
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

                {activeTab === 'inventory' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Expiration Alerts Banner */}
                        {(inventoryAlerts.expired.length > 0 || inventoryAlerts.expiringSoon.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {inventoryAlerts.expired.length > 0 && (
                                    <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-start">
                                        <div className="h-10 w-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 mr-4">
                                            <span className="material-symbols-outlined">warning</span>
                                        </div>
                                        <div>
                                            <h4 className="text-red-800 font-black text-sm uppercase tracking-wider">Produtos Vencidos</h4>
                                            <p className="text-red-600 text-xs mt-1 font-medium">Existem {inventoryAlerts.expired.length} produtos com data de validade ultrapassada no estoque.</p>
                                        </div>
                                    </div>
                                )}
                                {inventoryAlerts.expiringSoon.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start">
                                        <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 mr-4">
                                            <span className="material-symbols-outlined">notification_important</span>
                                        </div>
                                        <div>
                                            <h4 className="text-amber-800 font-black text-sm uppercase tracking-wider">Atenção ao Vencimento</h4>
                                            <p className="text-amber-600 text-xs mt-1 font-medium">{inventoryAlerts.expiringSoon.length} produtos vencem nos próximos 15 dias. Priorize o giro desses itens.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setMovementForm({
                                                type: 'purchase',
                                                quantity: 0,
                                                unit_cost: 0,
                                                movement_date: new Date().toLocaleDateString('sv-SE')
                                            });
                                            setIsMovementModalOpen(true);
                                        }}
                                        className="bg-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-bold flex items-center shadow-sm hover:bg-gray-200 transition-all"
                                    >
                                        <span className="material-symbols-outlined mr-2">swap_vert</span> Movimentar Estoque
                                    </button>
                                    <button
                                        onClick={() => { setEditingProduct({ stock_quantity: 0, price: 0, cost_price: 0, initial_stock: 0, initial_stock_date: new Date().toLocaleDateString('sv-SE') }); setIsProductModalOpen(true); }}
                                        className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                    >
                                        <span className="material-symbols-outlined mr-2">add_box</span> Novo Produto
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-4 py-5">Produto</th>
                                            <th className="px-4 py-5">Valores</th>
                                            <th className="px-4 py-5 text-center">Vencimento</th>
                                            <th className="px-4 py-5 text-center">Estoque</th>
                                            <th className="px-4 py-5 text-center">Status</th>
                                            <th className="px-4 py-5 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm text-gray-600">
                                        {products.map(p => {
                                            const stockCount = p.stock_quantity || 0;
                                            const isExpired = stockCount > 0 && p.expiration_date && new Date(p.expiration_date + 'T23:59:59') < new Date();
                                            const isExpiringSoon = stockCount > 0 && p.expiration_date && !isExpired && (
                                                new Date(p.expiration_date + 'T00:00:00') <= new Date(new Date().setDate(new Date().getDate() + 15))
                                            );

                                            return (
                                                <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${isExpired ? 'bg-red-50/30' : isExpiringSoon ? 'bg-amber-50/30' : ''}`}>
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
                                                    <td className="px-4 py-5 text-center">
                                                        <div className={`text-[10px] font-black uppercase ${p.expiration_date ? (new Date(p.expiration_date + 'T23:59:59') < new Date() ? 'text-red-500' : isExpiringSoon ? 'text-amber-600' : 'text-gray-500') : 'text-gray-300 italic'}`}>
                                                            {p.expiration_date ? formatDate(p.expiration_date) : 'Não inf.'}
                                                            {p.expiration_date && new Date(p.expiration_date + 'T23:59:59') < new Date() && (
                                                                <span className="block text-[8px] text-red-400 mt-1 animate-pulse">VENCIDO</span>
                                                            )}
                                                            {isExpiringSoon && (
                                                                <span className="block text-[8px] text-amber-500 mt-1">EM BREVE</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setMovementForm({ product_id: p.id, type: 'adjustment', quantity: 1, movement_date: new Date().toLocaleDateString('sv-SE') });
                                                                    setIsMovementModalOpen(true);
                                                                }}
                                                                className="h-6 w-6 rounded-lg border flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                                            >
                                                                <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                                                            </button>
                                                            <span className={`text-xs font-black w-6 text-center ${p.stock_quantity <= 5 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock_quantity}</span>
                                                            <button
                                                                onClick={() => {
                                                                    setMovementForm({ product_id: p.id, type: 'purchase', quantity: 1, unit_cost: p.cost_price, movement_date: new Date().toLocaleDateString('sv-SE') });
                                                                    setIsMovementModalOpen(true);
                                                                }}
                                                                className="h-6 w-6 rounded-lg border flex items-center justify-center hover:bg-green-50 hover:text-green-500 transition-all shadow-sm"
                                                            >
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
                                            );
                                        })}
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

                        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Data</label>
                                    <select
                                        value={salesFilters.dateType}
                                        onChange={e => setSalesFilters({ ...salesFilters, dateType: e.target.value as any })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    >
                                        <option value="sale_date">📅 Data da Venda</option>
                                        <option value="due_date">📅 Vencimento</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
                                    <input
                                        type="date"
                                        value={salesFilters.startDate}
                                        onChange={e => setSalesFilters({ ...salesFilters, startDate: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                                    <input
                                        type="date"
                                        value={salesFilters.endDate}
                                        onChange={e => setSalesFilters({ ...salesFilters, endDate: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Produto</label>
                                    <select
                                        value={salesFilters.productId}
                                        onChange={e => setSalesFilters({ ...salesFilters, productId: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    >
                                        <option value="">Todos</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                                    <select
                                        value={salesFilters.clientId}
                                        onChange={e => setSalesFilters({ ...salesFilters, clientId: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    >
                                        <option value="">Todos</option>
                                        {registrations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        value={salesFilters.status}
                                        onChange={e => setSalesFilters({ ...salesFilters, status: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    >
                                        <option value="">Todos</option>
                                        <option value="pending">⏳ Pendente</option>
                                        <option value="paid">✅ Pago</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Revendedor</label>
                                    <select
                                        value={salesFilters.resellerId}
                                        onChange={e => setSalesFilters({ ...salesFilters, resellerId: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    >
                                        <option value="">Todos</option>
                                        {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Mín.</label>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        value={salesFilters.minAmount}
                                        onChange={e => setSalesFilters({ ...salesFilters, minAmount: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Máx.</label>
                                    <input
                                        type="number"
                                        placeholder="9999,00"
                                        value={salesFilters.maxAmount}
                                        onChange={e => setSalesFilters({ ...salesFilters, maxAmount: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pesquisar</label>
                                    <input
                                        type="text"
                                        placeholder="Nome, ID, Revendedor..."
                                        value={salesFilters.search}
                                        onChange={e => setSalesFilters({ ...salesFilters, search: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={exportSalesToExcel}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">table_view</span> Excel
                                    </button>
                                    <button
                                        onClick={exportSalesToPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSalesFilters({
                                        startDate: '',
                                        endDate: '',
                                        dateType: 'sale_date',
                                        productId: '',
                                        clientId: '',
                                        resellerId: '',
                                        minAmount: '',
                                        maxAmount: '',
                                        status: '',
                                        search: ''
                                    })}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                >
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(() => {
                                const filteredSalesList = getFilteredSales();
                                return (
                                    <>
                                        {filteredSalesList.length === 0 ? (
                                            <div className="bg-gray-50 border-2 border-dashed rounded-3xl p-20 text-center text-gray-400 font-bold">
                                                Nenhuma venda encontrada com os filtros selecionados.
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden relative">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        <tr>
                                                            <th className="px-6 py-5 w-10">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded-lg border-gray-300 text-primary focus:ring-primary/20"
                                                                    checked={filteredSalesList.length > 0 && filteredSalesList.every(s => selectedSales.has(s.id))}
                                                                    onChange={(e) => {
                                                                        const newSelected = new Set(selectedSales);
                                                                        if (e.target.checked) filteredSalesList.forEach(s => newSelected.add(s.id));
                                                                        else filteredSalesList.forEach(s => newSelected.delete(s.id));
                                                                        setSelectedSales(newSelected);
                                                                    }}
                                                                />
                                                            </th>
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
                                                        {filteredSalesList.map(s => (
                                                            <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors ${selectedSales.has(s.id) ? 'bg-primary/5' : ''}`}>
                                                                <td className="px-6 py-5">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 rounded-lg border-gray-300 text-primary focus:ring-primary/20"
                                                                        checked={selectedSales.has(s.id)}
                                                                        onChange={() => {
                                                                            const newSelected = new Set(selectedSales);
                                                                            if (newSelected.has(s.id)) newSelected.delete(s.id);
                                                                            else newSelected.add(s.id);
                                                                            setSelectedSales(newSelected);
                                                                        }}
                                                                    />
                                                                </td>
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
                                                                        <button
                                                                            onClick={() => {
                                                                                const sDate = s.sale_date?.split('T')[0];
                                                                                const dDate = s.due_date?.split('T')[0];
                                                                                setSaleForm({ ...s, sale_date: sDate, due_date: dDate });
                                                                                setIsSaleModalOpen(true);
                                                                            }}
                                                                            className="h-7 w-7 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors"
                                                                        >
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

                                        {/* Floating Actions Bar for Sales */}
                                        {selectedSales.size > 0 && (
                                            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-8 py-5 rounded-[30px] shadow-2xl z-[150] flex items-center gap-8 border border-white/10 animate-in slide-in-from-bottom-10">
                                                <div className="flex items-center gap-3 pr-8 border-r border-white/10">
                                                    <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center font-black text-white">
                                                        {selectedSales.size}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecionados</span>
                                                        <span className="text-sm font-bold">Vendas prontas</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => setIsBulkEditModalOpen(true)}
                                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white font-black text-[11px] tracking-widest transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit</span> ALTERAR
                                                    </button>
                                                    <button
                                                        onClick={handleBulkDeleteSales}
                                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-black text-[11px] tracking-widest transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span> EXCLUIR
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedSales(new Set())}
                                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white font-black text-[11px] tracking-widest transition-all"
                                                    >
                                                        CANCELAR
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
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
                {activeTab === 'finances' && (() => {
                    const { incomeGroups, expenseGroups, totalIncome, totalExpense, initialBalance } = getCashFlowMetrics();
                    const projectedBalance = initialBalance + totalIncome - totalExpense;
                    const filteredListEntries = getFilteredFinancialEntries();

                    const toggleGroup = (id: string) => {
                        const newSet = new Set(expandedCFGroups);
                        if (newSet.has(id)) newSet.delete(id);
                        else newSet.add(id);
                        setExpandedCFGroups(newSet);
                    };

                    const adjustDate = (amount: number) => {
                        const newDate = new Date(cfBaseDate);
                        if (cashFlowMode === 'daily') newDate.setDate(newDate.getDate() + amount);
                        else newDate.setMonth(newDate.getMonth() + amount);
                        setCfBaseDate(newDate);
                    };

                    return (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                            {/* Finance Header - Mode Switcher */}
                            <div className="flex justify-center mb-4">
                                <div className="bg-gray-100 p-1.5 rounded-[24px] flex shadow-inner">
                                    <button
                                        onClick={() => setFinanceViewMode('dashboard')}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-[20px] text-[11px] font-black tracking-widest transition-all ${financeViewMode === 'dashboard' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hober:text-gray-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">dashboard</span> RESUMO FLUXO
                                    </button>
                                    <button
                                        onClick={() => setFinanceViewMode('list')}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-[20px] text-[11px] font-black tracking-widest transition-all ${financeViewMode === 'list' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">search</span> PESQUISA AVANÇADA
                                    </button>
                                </div>
                            </div>

                            {financeViewMode === 'dashboard' ? (
                                <>
                                    {/* Header Section */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div>
                                            <h1 className="text-3xl font-black text-gray-800">Fluxo de Caixa</h1>
                                            <p className="text-sm text-gray-400 font-medium">Controle entradas e saídas por data de <span className="text-primary font-bold">VENCIMENTO</span>.</p>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-100 p-1 rounded-2xl flex">
                                                <button
                                                    onClick={() => setCashFlowMode('daily')}
                                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${cashFlowMode === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    DIÁRIO
                                                </button>
                                                <button
                                                    onClick={() => setCashFlowMode('monthly')}
                                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${cashFlowMode === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    MENSAL
                                                </button>
                                            </div>

                                            <div className="flex items-center bg-white border rounded-2xl p-1 shadow-sm">
                                                <button onClick={() => adjustDate(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                                                <div className="px-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                                                    <span className="text-xs font-black text-gray-700 uppercase">
                                                        {cashFlowMode === 'daily'
                                                            ? cfBaseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                                                            : cfBaseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                                                        }
                                                    </span>
                                                </div>
                                                <button onClick={() => adjustDate(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="bg-white p-6 rounded-[32px] border shadow-sm group hover:shadow-md transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Inicial</p>
                                                <span className="material-symbols-outlined text-gray-200 group-hover:text-gray-400 transition-colors">account_balance_wallet</span>
                                            </div>
                                            <p className="text-xl font-black text-gray-800">R$ {initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[32px] border shadow-sm group hover:shadow-md transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entradas</p>
                                                <span className="material-symbols-outlined text-green-100 group-hover:text-green-400 transition-colors">trending_up</span>
                                            </div>
                                            <p className="text-xl font-black text-gray-800">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[32px] border shadow-sm group hover:shadow-md transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saídas</p>
                                                <span className="material-symbols-outlined text-red-100 group-hover:text-red-400 transition-colors">trending_down</span>
                                            </div>
                                            <p className="text-xl font-black text-gray-800">- R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[32px] border shadow-sm group hover:shadow-md transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investimentos</p>
                                                <span className="material-symbols-outlined text-purple-100 group-hover:text-purple-400 transition-colors">payments</span>
                                            </div>
                                            <p className="text-xl font-black text-gray-800">R$ 0,00</p>
                                        </div>
                                        <div className="bg-primary p-6 rounded-[32px] shadow-xl shadow-primary/20 group hover:scale-[1.02] transition-all">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Saldo Projetado</p>
                                                <span className="material-symbols-outlined text-white/30 group-hover:text-white/60 transition-colors">calculate</span>
                                            </div>
                                            <p className="text-xl font-black text-white">R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    {/* Actions Bar */}
                                    <div className="flex gap-4">
                                        <div className="relative group">
                                            <select className="bg-white border-none rounded-2xl px-6 py-4 text-xs font-black text-gray-500 shadow-sm appearance-none pr-12 cursor-pointer focus:ring-4 ring-primary/5 transition-all">
                                                <option>Todas as Contas</option>
                                                {bankAccounts.map(b => <option key={b.id}>{b.name}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">expand_more</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setFinancialForm({
                                                    type: 'payable',
                                                    due_date: cfBaseDate.toLocaleDateString('sv-SE'),
                                                    entry_date: new Date().toLocaleDateString('sv-SE'),
                                                    status: 'pending'
                                                });
                                                setIsFinancialModalOpen(true);
                                            }}
                                            className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 flex items-center hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined mr-2">add</span> NOVO LANÇAMENTO
                                        </button>
                                    </div>

                                    {/* Fluxo de Entrada Section */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="px-4 py-1.5 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full">Fluxo de Entrada</span>
                                            <div className="h-px bg-gray-100 flex-1"></div>
                                        </div>

                                        <div className="space-y-3">
                                            {incomeGroups.length === 0 ? (
                                                <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-widest">Nenhuma receita para este período</p>
                                            ) : incomeGroups.map((group: any) => (
                                                <div key={group.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden group">
                                                    <button
                                                        onClick={() => toggleGroup(group.id)}
                                                        className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                                                                <span className="material-symbols-outlined text-sm font-bold">payments</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="font-black text-gray-800 text-sm">{group.name}</h3>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{group.count} LANÇAMENTOS</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="text-sm font-black text-green-600">+ R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            <span className={`material-symbols-outlined text-gray-300 transition-transform duration-300 ${expandedCFGroups.has(group.id) ? 'rotate-180' : ''}`}>expand_more</span>
                                                        </div>
                                                    </button>

                                                    {expandedCFGroups.has(group.id) && (
                                                        <div className="bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                                        <th className="px-4 py-3 text-center w-10">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={group.entries.every((e: any) => selectedEntries.has(e.id)) && group.entries.length > 0}
                                                                                onChange={() => {
                                                                                    const ids = group.entries.map((e: any) => e.id);
                                                                                    const allSelected = ids.every((id: string) => selectedEntries.has(id));
                                                                                    setSelectedEntries(prev => {
                                                                                        const next = new Set(prev);
                                                                                        ids.forEach((id: string) => allSelected ? next.delete(id) : next.add(id));
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                                                            />
                                                                        </th>
                                                                        <th className="px-4 py-3">Data</th>
                                                                        <th className="px-4 py-3">Descrição</th>
                                                                        <th className="px-4 py-3">Conta</th>
                                                                        <th className="px-4 py-3 text-right">Valor</th>
                                                                        <th className="px-4 py-3 text-center">Ações</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100/50">
                                                                    {group.entries.map((e: any) => (
                                                                        <tr key={e.id} className={`hover:bg-white transition-colors ${selectedEntries.has(e.id) ? 'bg-primary/5' : ''}`}>
                                                                            <td className="px-4 py-4 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedEntries.has(e.id)}
                                                                                    onChange={() => {
                                                                                        setSelectedEntries(prev => {
                                                                                            const next = new Set(prev);
                                                                                            if (next.has(e.id)) next.delete(e.id);
                                                                                            else next.add(e.id);
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                                                                />
                                                                            </td>
                                                                            <td className="px-4 py-4 font-bold text-gray-400">{formatDate(e.due_date)}</td>
                                                                            <td className="px-4 py-4 font-black text-gray-700">{e.description}</td>
                                                                            <td className="px-4 py-4 font-bold text-gray-400">{bankAccounts.find(b => b.id === e.bank_account_id)?.name || 'N/A'}</td>
                                                                            <td className="px-4 py-4 text-right font-black text-green-600">R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                                            <td className="px-4 py-4 text-center">
                                                                                <div className="flex items-center justify-center gap-2">
                                                                                    <button onClick={() => { setFinancialForm(e); setIsFinancialModalOpen(true); }} className="text-blue-400 hover:text-blue-600"><span className="material-symbols-outlined text-xs">edit</span></button>
                                                                                    <button onClick={() => handleDeleteFinancial(e.id)} className="text-red-400 hover:text-red-500"><span className="material-symbols-outlined text-xs">delete</span></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {incomeGroups.length > 0 && (
                                                <div className="bg-green-500/5 rounded-3xl p-6 flex justify-between items-center border border-green-500/10">
                                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Total de Receitas Operacionais</span>
                                                    <span className="text-xl font-black text-green-600">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Fluxo de Saída Section */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full">Fluxo de Saída</span>
                                            <div className="h-px bg-gray-100 flex-1"></div>
                                        </div>

                                        <div className="space-y-3">
                                            {expenseGroups.length === 0 ? (
                                                <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-widest">Nenhuma despesa para este período</p>
                                            ) : expenseGroups.map((group: any) => (
                                                <div key={group.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden group">
                                                    <button
                                                        onClick={() => toggleGroup(group.id)}
                                                        className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                                                                <span className="material-symbols-outlined text-sm font-bold">shopping_bag</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="font-black text-gray-800 text-sm">{group.name}</h3>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{group.count} LANÇAMENTOS</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="text-sm font-black text-red-600">- R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            <span className={`material-symbols-outlined text-gray-300 transition-transform duration-300 ${expandedCFGroups.has(group.id) ? 'rotate-180' : ''}`}>expand_more</span>
                                                        </div>
                                                    </button>

                                                    {expandedCFGroups.has(group.id) && (
                                                        <div className="bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                                        <th className="px-4 py-3 text-center w-10">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={group.entries.every((e: any) => selectedEntries.has(e.id)) && group.entries.length > 0}
                                                                                onChange={() => {
                                                                                    const ids = group.entries.map((e: any) => e.id);
                                                                                    const allSelected = ids.every((id: string) => selectedEntries.has(id));
                                                                                    setSelectedEntries(prev => {
                                                                                        const next = new Set(prev);
                                                                                        ids.forEach((id: string) => allSelected ? next.delete(id) : next.add(id));
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                                                            />
                                                                        </th>
                                                                        <th className="px-4 py-3">Data</th>
                                                                        <th className="px-4 py-3">Descrição</th>
                                                                        <th className="px-4 py-3">Conta</th>
                                                                        <th className="px-4 py-3 text-right">Valor</th>
                                                                        <th className="px-4 py-3 text-center">Ações</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100/50">
                                                                    {group.entries.map((e: any) => (
                                                                        <tr key={e.id} className={`hover:bg-white transition-colors ${selectedEntries.has(e.id) ? 'bg-primary/5' : ''}`}>
                                                                            <td className="px-4 py-4 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedEntries.has(e.id)}
                                                                                    onChange={() => {
                                                                                        setSelectedEntries(prev => {
                                                                                            const next = new Set(prev);
                                                                                            if (next.has(e.id)) next.delete(e.id);
                                                                                            else next.add(e.id);
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                                                                />
                                                                            </td>
                                                                            <td className="px-4 py-4 font-bold text-gray-400">{formatDate(e.due_date)}</td>
                                                                            <td className="px-4 py-4 font-black text-gray-700">{e.description}</td>
                                                                            <td className="px-4 py-4 font-bold text-gray-400">{bankAccounts.find(b => b.id === e.bank_account_id)?.name || 'N/A'}</td>
                                                                            <td className="px-4 py-4 text-right font-black text-red-600">R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                                            <td className="px-4 py-4 text-center">
                                                                                <div className="flex items-center justify-center gap-2">
                                                                                    <button onClick={() => { setFinancialForm(e); setIsFinancialModalOpen(true); }} className="text-blue-400 hover:text-blue-600"><span className="material-symbols-outlined text-xs">edit</span></button>
                                                                                    <button onClick={() => handleDeleteFinancial(e.id)} className="text-red-400 hover:text-red-500"><span className="material-symbols-outlined text-xs">delete</span></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {expenseGroups.length > 0 && (
                                                <div className="bg-red-500/5 rounded-3xl p-6 flex justify-between items-center border border-red-500/10">
                                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Total de Despesas Operacionais</span>
                                                    <span className="text-xl font-black text-red-600">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </>
                            ) : (
                                <section className="space-y-6">
                                    <div className="bg-white p-8 rounded-[40px] border shadow-sm">
                                        <div className="flex flex-col gap-6">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-xl font-black text-gray-800">Filtros de Pesquisa</h2>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => {
                                                            const doc = new jsPDF();
                                                            doc.text('Relatório Financeiro', 14, 15);
                                                            const data = filteredListEntries.map(e => [
                                                                formatDate(e.due_date),
                                                                formatDate(e.entry_date || e.created_at),
                                                                e.description,
                                                                e.category,
                                                                bankAccounts.find(b => b.id === e.bank_account_id)?.name || '-',
                                                                e.status === 'paid' ? 'Pago' : 'Pendente',
                                                                `R$ ${e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                            ]);
                                                            autoTable(doc, {
                                                                head: [['Vencimento', 'Inclusão', 'Descrição', 'Categoria', 'Conta', 'Status', 'Valor']],
                                                                body: data,
                                                                startY: 20,
                                                            });
                                                            doc.save('financeiro-export.pdf');
                                                        }}
                                                        className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">download</span> Exportar PDF
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const header = "Vencimento;Inclusão;Descrição;Categoria;Conta;Status;Valor\n";
                                                            const rows = filteredListEntries.map(e => {
                                                                const dueDate = formatDate(e.due_date);
                                                                const entryDate = formatDate(e.entry_date || e.created_at);
                                                                const desc = e.description.replace(/;/g, ',');
                                                                const cat = e.category;
                                                                const bank = bankAccounts.find(b => b.id === e.bank_account_id)?.name || '-';
                                                                const status = e.status === 'paid' ? 'Pago' : 'Pendente';
                                                                const value = e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                                return `${dueDate};${entryDate};${desc};${cat};${bank};${status};R$ ${value}`;
                                                            }).join("\n");

                                                            const csvContent = "\uFEFF" + header + rows;
                                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                            const url = URL.createObjectURL(blob);
                                                            const link = document.createElement("a");
                                                            link.setAttribute("href", url);
                                                            link.setAttribute("download", "financeiro-export.csv");
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                        className="bg-green-500/10 text-green-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">table_view</span> Exportar Excel
                                                    </button>
                                                    <button
                                                        onClick={() => setFinancialFilters({
                                                            startDate: '', endDate: '', dateType: 'due_date', category_id: '',
                                                            bank_account_id: '', payment_method: '', status: '', search: ''
                                                        })}
                                                        className="text-[10px] font-black text-gray-400 uppercase hover:text-primary transition-all"
                                                    >
                                                        Limpar Filtros
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Tipo de Data</label>
                                                    <select
                                                        value={financialFilters.dateType}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, dateType: e.target.value as any })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600 focus:ring-2 ring-primary/20"
                                                    >
                                                        <option value="due_date">Data de Vencimento</option>
                                                        <option value="entry_date">Data de Inclusão</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">De</label>
                                                    <input
                                                        type="date"
                                                        value={financialFilters.startDate}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, startDate: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600 focus:ring-2 ring-primary/20"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Até</label>
                                                    <input
                                                        type="date"
                                                        value={financialFilters.endDate}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, endDate: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600 focus:ring-2 ring-primary/20"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Categoria</label>
                                                    <select
                                                        value={financialFilters.category_id}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, category_id: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600 focus:ring-2 ring-primary/20"
                                                    >
                                                        <option value="">Todas as Categorias</option>
                                                        {categories.filter(c => !c.parent_id).map(parent => (
                                                            <React.Fragment key={parent.id}>
                                                                <option value={parent.id}>{parent.name}</option>
                                                                {categories.filter(c => c.parent_id === parent.id).map(sub => (
                                                                    <option key={sub.id} value={sub.id}>&nbsp;&nbsp;— {sub.name}</option>
                                                                ))}
                                                            </React.Fragment>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Conta / Banco</label>
                                                    <select
                                                        value={financialFilters.bank_account_id}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, bank_account_id: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600"
                                                    >
                                                        <option value="">Todas</option>
                                                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Meio de Pagto</label>
                                                    <select
                                                        value={financialFilters.payment_method}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, payment_method: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600"
                                                    >
                                                        <option value="">Todos</option>
                                                        <option value="pix">PIX</option>
                                                        <option value="credit_card">Cartão de Crédito</option>
                                                        <option value="debit_card">Cartão de Débito</option>
                                                        <option value="cash">Dinheiro</option>
                                                        <option value="credit_acc">Crédito em Conta</option>
                                                        <option value="other">Outros</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Status</label>
                                                    <select
                                                        value={financialFilters.status}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, status: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600"
                                                    >
                                                        <option value="">Todos</option>
                                                        <option value="pending">Pendente</option>
                                                        <option value="paid">Pago</option>
                                                        <option value="overdue">Atrasado</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase px-2">Descrição / Busca</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Pesquisar..."
                                                        value={financialFilters.search}
                                                        onChange={(e) => setFinancialFilters({ ...financialFilters, search: e.target.value })}
                                                        className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50/50 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                        <th className="px-6 py-4 text-center w-10">
                                                            <input
                                                                type="checkbox"
                                                                checked={filteredListEntries.length > 0 && filteredListEntries.every(e => selectedEntries.has(e.id))}
                                                                onChange={() => {
                                                                    const ids = filteredListEntries.map(e => e.id);
                                                                    const allSelected = ids.every(id => selectedEntries.has(id));
                                                                    setSelectedEntries(prev => {
                                                                        const next = new Set(prev);
                                                                        ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                                            />
                                                        </th>
                                                        <th className="px-6 py-4">Vencimento</th>
                                                        <th className="px-6 py-4">Inclusão</th>
                                                        <th className="px-6 py-4">Descrição</th>
                                                        <th className="px-6 py-4">Categoria</th>
                                                        <th className="px-6 py-4">Conta</th>
                                                        <th className="px-6 py-4">Meio</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4 text-right">Valor</th>
                                                        <th className="px-6 py-4 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100/50">
                                                    {filteredListEntries.length === 0 ? (
                                                        <tr><td colSpan={10} className="px-6 py-20 text-center text-gray-300 font-black uppercase tracking-widest">Nenhum lançamento encontrado</td></tr>
                                                    ) : filteredListEntries.map(e => (
                                                        <tr key={e.id} className={`hover:bg-gray-50/30 transition-colors ${selectedEntries.has(e.id) ? 'bg-primary/5' : ''}`}>
                                                            <td className="px-6 py-4 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedEntries.has(e.id)}
                                                                    onChange={() => {
                                                                        setSelectedEntries(prev => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(e.id)) next.delete(e.id);
                                                                            else next.add(e.id);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-600">{formatDate(e.due_date)}</td>
                                                            <td className="px-6 py-4 text-[10px] text-gray-400">{formatDate(e.entry_date || e.created_at)}</td>
                                                            <td className="px-6 py-4 font-black text-gray-800">{e.description}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[10px] font-bold text-gray-400 border px-2 py-0.5 rounded-lg uppercase">{e.category}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-500 font-medium">{bankAccounts.find(b => b.id === e.bank_account_id)?.name || '-'}</td>
                                                            <td className="px-6 py-4 uppercase text-[10px] font-black text-gray-400">{e.payment_method || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${e.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                    {e.status === 'paid' ? 'Pago' : e.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                                                                </span>
                                                            </td>
                                                            <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${e.type === 'receivable' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {e.type === 'receivable' ? '+' : '-'} R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button onClick={() => { setFinancialForm(e); setIsFinancialModalOpen(true); }} className="h-7 w-7 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                                                                        <span className="material-symbols-outlined text-xs">edit</span>
                                                                    </button>
                                                                    <button onClick={() => handleDeleteFinancial(e.id)} className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
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
                                </section>
                            )}

                            {/* Floating Bulk Action Bar */}
                            {selectedEntries.size > 0 && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-500 z-50">
                                    <div className="flex items-center gap-3 pr-8 border-r border-white/10">
                                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-xs">
                                            {selectedEntries.size}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Selecionados</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleBulkMarkAsPaid}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-xs font-black uppercase tracking-widest text-green-400"
                                        >
                                            <span className="material-symbols-outlined text-sm">check_circle</span> Liquidar
                                        </button>
                                        <button
                                            onClick={handleBulkDelete}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-xs font-black uppercase tracking-widest text-red-500"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span> Excluir
                                        </button>
                                        <button
                                            onClick={() => setSelectedEntries(new Set())}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-xs font-black uppercase tracking-widest text-gray-400"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span> Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Accounts & Cards Tab */}
                {activeTab === 'accounts' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 h-[calc(100vh-140px)] flex flex-col">
                        <section className="bg-white p-8 rounded-[40px] border shadow-sm flex justify-between items-center bg-gradient-to-r from-white to-gray-50/50">
                            <div>
                                <h1 className="text-2xl font-black text-gray-800">Cartões de Crédito</h1>
                                <p className="text-sm text-gray-400">Gerencie seus limites, faturas e cartões.</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => { setAccountForm({ balance: 0 }); setIsAccountModalOpen(true); }} className="px-6 py-4 bg-white border border-gray-100 rounded-[24px] font-black text-xs text-gray-500 hover:bg-gray-50 flex items-center shadow-sm transition-all hover:scale-105 active:scale-95">
                                    <span className="material-symbols-outlined mr-2">account_balance_wallet</span> Gerenciar Bancos
                                </button>
                                <button onClick={() => { setCardForm({ limit_amount: 0, current_balance: 0 }); setIsCardModalOpen(true); }} className="px-6 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-xs shadow-xl shadow-indigo-200 flex items-center transition-all hover:scale-105 active:scale-95">
                                    <span className="material-symbols-outlined mr-2">add</span> Adicionar Cartão
                                </button>
                            </div>
                        </section>

                        <div className="flex flex-1 gap-8 min-h-0">
                            {/* Left Column: Card List & Bank Accounts */}
                            <div className="w-80 flex flex-col gap-8 overflow-y-auto pr-2 pb-10">
                                <section className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meus Cartões</h3>
                                        <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full">{creditCards.length}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {creditCards.length === 0 ? (
                                            <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-300 text-[10px] font-black uppercase">Nenhum cartão</div>
                                        ) : creditCards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => setSelectedCardId(card.id)}
                                                className={`w-full p-4 rounded-[28px] border text-left transition-all relative overflow-hidden group ${selectedCardId === card.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`h-11 w-11 ${card.color || 'bg-indigo-600'} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100`}>
                                                        <span className="material-symbols-outlined text-sm">credit_card</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-black text-gray-800 truncate uppercase mt-0.5">{card.name}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold tracking-tighter">FINAL {card.last_4_digits || '0000'}</p>
                                                    </div>
                                                    {selectedCardId === card.id && (
                                                        <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                                            <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contas Bancárias</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {bankAccounts.map(bank => (
                                            <div key={bank.id} className="bg-white p-5 rounded-[28px] border border-gray-100 flex justify-between items-center shadow-sm hover:border-gray-200 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-gray-300 uppercase truncate mb-1">{bank.name}</p>
                                                    <p className="text-sm font-black text-gray-800 truncate tracking-tight">R$ {bank.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                                <button onClick={() => { setAccountForm(bank); setIsAccountModalOpen(true); }} className="h-8 w-8 bg-gray-50 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {selectedCardId && (
                                    <button
                                        onClick={() => {
                                            const card = creditCards.find(c => c.id === selectedCardId);
                                            if (card) {
                                                askConfirmation('Remover Cartão', `Deseja realmente remover o cartão ${card.name}?`, async () => {
                                                    await supabase.from('credit_cards').delete().eq('id', card.id);
                                                    setSelectedCardId(null);
                                                    fetchData();
                                                });
                                            }
                                        }}
                                        className="w-full py-4 rounded-[20px] border border-red-50 text-red-400 text-[10px] font-black uppercase hover:bg-red-50 transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span> Remover Cartão
                                    </button>
                                )}
                            </div>

                            {/* Right Column: Details */}
                            <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-20 scrollbar-hide">
                                {selectedCardId ? (() => {
                                    const card = creditCards.find(c => c.id === selectedCardId)!;
                                    const { available, spent, invoiceTotal, invoiceEntries, categoryData } = getCardMetrics(selectedCardId, invoiceDate.getMonth(), invoiceDate.getFullYear());
                                    const spentPercent = Math.min(100, (spent / card.limit_amount) * 100);

                                    return (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                            {/* Header Metrics */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                                {/* Visual Card */}
                                                <div className={`${card.color || 'bg-indigo-600'} rounded-[40px] p-8 text-white relative shadow-2xl overflow-hidden aspect-[1.15/1] xl:aspect-[1.25/1] flex flex-col justify-between group transform transition-all hover:scale-[1.02] active:scale-95 cursor-pointer`}>
                                                    <div className="absolute -top-12 -right-12 h-48 w-48 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all" />
                                                    <div className="absolute -bottom-8 -left-8 h-32 w-32 bg-black/10 rounded-full blur-2xl" />

                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <h3 className="font-black text-xl tracking-tight leading-none mb-1">{card.name}</h3>
                                                            <div className="flex items-center gap-2 opacity-60">
                                                                <span className="material-symbols-outlined text-[10px]">contactless</span>
                                                                <p className="text-[9px] font-bold tracking-widest uppercase">NÚMERO DO CARTÃO</p>
                                                            </div>
                                                            <p className="font-bold tracking-[0.25em] text-lg mt-4 drop-shadow-lg">•••• •••• •••• {card.last_4_digits || '0000'}</p>
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); setCardForm(card); setIsCardModalOpen(true); }} className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/40">
                                                            <span className="material-symbols-outlined text-sm text-white">edit</span>
                                                        </button>
                                                    </div>

                                                    <div className="flex justify-between items-end relative z-10 mt-auto pb-2">
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] uppercase font-black opacity-40 mb-1">Bandeira</p>
                                                            <p className="font-black text-xs uppercase tracking-widest whitespace-nowrap truncate">{card.brand || 'NUTRA'}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-4">
                                                            <p className="text-[9px] uppercase font-black opacity-40 mb-1">Fechamento / Vencimento</p>
                                                            <p className="font-black text-xs uppercase whitespace-nowrap">DIA {card.closing_day} / {card.due_day}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Limit Info */}
                                                <div className="bg-white rounded-[40px] border p-8 flex flex-col justify-center shadow-sm relative overflow-hidden aspect-[1.15/1] xl:aspect-[1.25/1]">
                                                    <div className="absolute top-0 right-0 p-6 opacity-5">
                                                        <span className="material-symbols-outlined text-8xl">account_balance</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                                        <div className="h-10 w-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                                                            <span className="material-symbols-outlined">analytics</span>
                                                        </div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Limite Total</p>
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-800 mb-6 relative z-10 whitespace-nowrap">R$ {card.limit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden relative z-10">
                                                        <div className="bg-blue-500 h-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${spentPercent}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-3 relative z-10">
                                                        <span className="text-blue-500">R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> em aberto ({spentPercent.toFixed(1)}%)
                                                    </p>
                                                </div>

                                                <div className="bg-white rounded-[40px] border p-8 flex flex-col justify-center shadow-sm relative overflow-hidden aspect-[1.15/1] xl:aspect-[1.25/1]">
                                                    <div className="absolute top-0 right-0 p-6 opacity-5">
                                                        <span className="material-symbols-outlined text-8xl text-green-500">check_circle</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                                        <div className="h-10 w-10 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
                                                            <span className="material-symbols-outlined">verified</span>
                                                        </div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Limite Disponível</p>
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-800 mb-6 relative z-10 whitespace-nowrap">R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <div className="flex items-center gap-2 relative z-10">
                                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                                        <p className="text-[10px] text-green-500 font-black uppercase tracking-tight">LIBERADO PARA COMPRAS</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Invoice Section */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                <div className="lg:col-span-2 bg-white rounded-[40px] border shadow-sm flex flex-col min-h-[500px] overflow-hidden">
                                                    <div className="p-8 border-b flex justify-between items-center bg-gray-50/20">
                                                        <div className="flex items-center gap-5">
                                                            <button
                                                                onClick={() => {
                                                                    const prev = new Date(invoiceDate);
                                                                    prev.setMonth(prev.getMonth() - 1);
                                                                    setInvoiceDate(prev);
                                                                }}
                                                                className="h-11 w-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                                                            >
                                                                <span className="material-symbols-outlined text-gray-400">chevron_left</span>
                                                            </button>
                                                            <div className="text-center">
                                                                <h3 className="text-xl font-black text-gray-800 capitalize leading-none mb-1">
                                                                    {invoiceDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                                                </h3>
                                                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-500 text-[8px] font-black uppercase">Vencimento: {formatDate(new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), card.due_day).toISOString())}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const next = new Date(invoiceDate);
                                                                    next.setMonth(next.getMonth() + 1);
                                                                    setInvoiceDate(next);
                                                                }}
                                                                className="h-11 w-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                                                            >
                                                                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                                            </button>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 whitespace-nowrap">TOTAL DA FATURA</p>
                                                            <p className="text-3xl font-black text-gray-800 whitespace-nowrap">R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 overflow-x-auto">
                                                        <table className="w-full">
                                                            <thead className="bg-gray-50/50 text-[9px] text-gray-400 font-black uppercase tracking-widest border-b">
                                                                <tr>
                                                                    <th className="px-8 py-5 text-left whitespace-nowrap">Data</th>
                                                                    <th className="px-8 py-5 text-left whitespace-nowrap">Descrição / Categoria</th>
                                                                    <th className="px-8 py-5 text-right whitespace-nowrap">Valor Lançado</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y text-sm">
                                                                {invoiceEntries.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={3} className="py-24 text-center">
                                                                            <div className="opacity-10 mb-4 animate-bounce"><span className="material-symbols-outlined text-5xl">receipt_long</span></div>
                                                                            <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhuma movimentação identificada</p>
                                                                        </td>
                                                                    </tr>
                                                                ) : invoiceEntries.map(entry => (
                                                                    <tr key={entry.id} className="hover:bg-gray-50/30 transition-colors group">
                                                                        <td className="px-8 py-5 text-[10px] text-gray-400 font-bold font-mono uppercase whitespace-nowrap">{formatDate(entry.due_date)}</td>
                                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                                            <p className="font-black text-gray-700 text-xs mb-0.5 truncate max-w-[200px]">{entry.description}</p>
                                                                            <span className="px-2 py-0.5 rounded-lg bg-gray-50 text-gray-400 text-[8px] font-black uppercase">{categories.find(c => c.id === (entry as any).category_id)?.name || entry.category}</span>
                                                                        </td>
                                                                        <td className="px-8 py-5 text-right whitespace-nowrap">
                                                                            <p className="font-black text-gray-800 text-sm">R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                                            {entry.installments_total && entry.installments_total > 1 && (
                                                                                <span className="text-[8px] text-indigo-400 font-black uppercase">Parcela {entry.installment_number}/{entry.installments_total}</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-[40px] border shadow-sm p-8 flex flex-col overflow-hidden">
                                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 px-2">Detalhamento por Categoria</h3>
                                                    <div className="space-y-7 flex-1 overflow-y-auto pr-2">
                                                        {Object.keys(categoryData).length === 0 ? (
                                                            <div className="h-full flex items-center justify-center text-gray-200 font-bold italic text-xs">Sem lançamentos</div>
                                                        ) : Object.keys(categoryData).sort((a, b) => categoryData[b] - categoryData[a]).map((cat, idx) => {
                                                            const val = categoryData[cat];
                                                            const perc = (val / invoiceTotal) * 100;
                                                            const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                                                            const colorClass = colors[idx % colors.length];
                                                            return (
                                                                <div key={cat} className="space-y-3">
                                                                    <div className="flex justify-between items-end">
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                                                                                <span className="text-[10px] font-black text-gray-600 uppercase truncate max-w-[120px]">{cat}</span>
                                                                            </div>
                                                                            <p className="text-[9px] text-gray-300 font-bold ml-4">{perc.toFixed(1)}% do total</p>
                                                                        </div>
                                                                        <span className="text-xs font-black text-gray-800">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                                                                        <div className={`${colorClass} h-full opacity-90 transition-all duration-1000`} style={{ width: `${perc}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="pt-8 mt-auto border-t">
                                                        <div className="bg-indigo-50 rounded-2xl p-4 flex items-center gap-3">
                                                            <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                                                <span className="material-symbols-outlined text-sm">savings</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[8px] font-black text-indigo-400 uppercase leading-none mb-1">Economia Prevista</p>
                                                                <p className="text-[10px] text-indigo-600 font-bold">Considere liquidar a fatura antecipadamente se houver descontos.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })() : (
                                    <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-[60px] border-4 border-dashed border-white shadow-inner">
                                        <div className="text-center space-y-6 max-w-xs animate-pulse">
                                            <div className="h-24 w-24 bg-white rounded-[32px] flex items-center justify-center mx-auto shadow-xl border border-gray-100">
                                                <span className="material-symbols-outlined text-5xl text-gray-200">credit_score</span>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-black text-gray-400 uppercase tracking-[0.2em] text-[10px]">Portal de Cartões</p>
                                                <p className="text-gray-300 text-xs font-medium px-4">Selecione um cartão na lista lateral para visualizar faturas e limites.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                        {categories.filter(c => c.type === 'income' && !c.parent_id).map(cat => (
                                            <div key={cat.id}>
                                                <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                    <span className="font-bold text-gray-700">{cat.name}</span>
                                                    <button onClick={() => { setCategoryForm(cat); setIsCategoryModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                </div>
                                                {/* Subcategories */}
                                                {categories.filter(sub => sub.parent_id === cat.id).map(sub => (
                                                    <div key={sub.id} className="p-4 pl-12 flex justify-between items-center bg-gray-50/50 hover:bg-gray-100 transition-colors border-t border-gray-100/50">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-xs text-gray-300">subdirectory_arrow_right</span>
                                                            <span className="text-gray-600 font-medium text-sm">{sub.name}</span>
                                                        </div>
                                                        <button onClick={() => { setCategoryForm(sub); setIsCategoryModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                            <span className="material-symbols-outlined text-[10px]">edit</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest ml-4">Despesas</h3>
                                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                    <div className="divide-y">
                                        {categories.filter(c => c.type === 'expense' && !c.parent_id).map(cat => (
                                            <div key={cat.id}>
                                                <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                    <span className="font-bold text-gray-700">{cat.name}</span>
                                                    <button onClick={() => { setCategoryForm(cat); setIsCategoryModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                </div>
                                                {/* Subcategories */}
                                                {categories.filter(sub => sub.parent_id === cat.id).map(sub => (
                                                    <div key={sub.id} className="p-4 pl-12 flex justify-between items-center bg-gray-50/50 hover:bg-gray-100 transition-colors border-t border-gray-100/50">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-xs text-gray-300">subdirectory_arrow_right</span>
                                                            <span className="text-gray-600 font-medium text-sm">{sub.name}</span>
                                                        </div>
                                                        <button onClick={() => { setCategoryForm(sub); setIsCategoryModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                            <span className="material-symbols-outlined text-[10px]">edit</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
                {/* DRE Tab */}
                {activeTab === 'dre' && (() => {

                    const ExpandableRow = ({
                        rowKey,
                        label,
                        value,
                        details = [],
                        indent = false,
                        isTotal = false,
                        negative = false,
                        baseValue = dreData.grossRevenue
                    }: any) => {
                        const isExpanded = expandedDreRow === rowKey;
                        const hasDetails = details && details.length > 0;

                        return (
                            <div>
                                <div
                                    onClick={() => hasDetails && setExpandedDreRow(isExpanded ? null : rowKey)}
                                    className={`flex justify-between items-center py-4 px-6 ${isTotal ? 'bg-gray-50 font-black text-gray-800 border-y' : 'border-b border-gray-50'} ${hasDetails ? 'cursor-pointer hover:bg-gray-50/70 transition-colors' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {indent && <div className="w-6 h-px bg-gray-200 mr-3" />}
                                        <span className={`${indent ? 'text-gray-500 text-sm' : 'text-gray-700 font-bold'}`}>{label}</span>
                                        {hasDetails && (
                                            <span className={`material-symbols-outlined text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-gray-300`}>
                                                expand_more
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className={`text-[10px] font-black w-16 text-right ${isTotal ? 'text-primary' : 'text-gray-300'}`}>
                                            {formatPercent(value, baseValue)}
                                        </span>
                                        <span className={`font-mono text-sm min-w-[120px] text-right ${negative ? 'text-red-500' : isTotal ? 'text-primary' : 'text-gray-700'}`}>
                                            {negative ? '-' : ''} {formatCurrency(value)}
                                        </span>
                                    </div>
                                </div>

                                {/* Details Panel */}
                                {isExpanded && hasDetails && (
                                    <div className="bg-gray-50/80 border-b border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                        <div className="px-8 py-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="material-symbols-outlined text-sm text-primary">info</span>
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Composição</span>
                                            </div>
                                            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                                                            <th className="px-4 py-3">Data</th>
                                                            <th className="px-4 py-3">Descrição</th>
                                                            {details[0]?.category && <th className="px-4 py-3">Categoria</th>}
                                                            {details[0]?.quantity !== undefined && <th className="px-4 py-3 text-right">Qtd</th>}
                                                            <th className="px-4 py-3 text-right">Valor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {details.map((item: any, idx: number) => (
                                                            <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-4 py-3 text-gray-500 font-medium">{formatDate(item.date)}</td>
                                                                <td className="px-4 py-3 font-medium text-gray-700">{item.description}</td>
                                                                {item.category !== undefined && <td className="px-4 py-3 text-gray-400">{item.category || '-'}</td>}
                                                                {item.quantity !== undefined && <td className="px-4 py-3 text-right text-gray-500">{item.quantity}</td>}
                                                                <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${negative ? 'text-red-500' : 'text-gray-700'}`}>
                                                                    {formatCurrency(item.amount)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-gray-50/80 border-t">
                                                            <td colSpan={details[0]?.category !== undefined ? 3 : 2} className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                Total ({details.length} itens)
                                                            </td>
                                                            {details[0]?.quantity !== undefined && <td className="px-4 py-3"></td>}
                                                            <td className={`px-4 py-3 text-right font-black whitespace-nowrap ${negative ? 'text-red-600' : 'text-primary'}`}>
                                                                {formatCurrency(value)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    };

                    const Row = ({ label, value, indent = false, isTotal = false, negative = false, baseValue = dreData.grossRevenue }: any) => (
                        <div className={`flex justify-between items-center py-4 px-6 ${isTotal ? 'bg-gray-50 font-black text-gray-800 border-y' : 'border-b border-gray-50'}`}>
                            <div className="flex items-center">
                                {indent && <div className="w-6 h-px bg-gray-200 mr-3" />}
                                <span className={`${indent ? 'text-gray-500 text-sm' : 'text-gray-700 font-bold'}`}>{label}</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <span className={`text-[10px] font-black w-16 text-right ${isTotal ? 'text-primary' : 'text-gray-300'}`}>
                                    {formatPercent(value, baseValue)}
                                </span>
                                <span className={`font-mono text-sm min-w-[120px] text-right ${negative ? 'text-red-500' : isTotal ? 'text-primary' : 'text-gray-700'}`}>
                                    {negative ? '-' : ''} {formatCurrency(value)}
                                </span>
                            </div>
                        </div>
                    );

                    return (
                        <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden animate-in fade-in duration-500 max-w-5xl mx-auto">
                            <div className="p-10 border-b bg-gray-50/30">
                                <h2 className="text-2xl font-black text-gray-800">DRE - Demonstrativo de Resultado</h2>
                                <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Resumo Financeiro do Período Selecionado</p>
                                <p className="text-[10px] text-primary mt-2 font-bold">💡 Clique nas linhas para ver detalhamento</p>
                            </div>

                            <div className="flex flex-col">
                                <ExpandableRow rowKey="revenue" label="Receita Bruta" value={dreData.grossRevenue} details={dreData.revenueDetails} />
                                <Row label="(-) Devoluções/Cancelamentos" value={dreData.cancellations} negative indent />
                                <Row label="(=) Receita Líquida" value={dreData.netRevenue} isTotal />

                                <ExpandableRow rowKey="cpv" label="(-) CPV (Custo do Produto Vendido)" value={dreData.cpv} details={dreData.cpvDetails} negative indent />
                                <Row label="(=) Margem de Contribuição" value={dreData.contributionMargin} isTotal />

                                <ExpandableRow rowKey="fixed" label="(-) Despesas Fixas" value={dreData.fixedExpenses} details={dreData.fixedDetails} negative indent />
                                <Row label="(=) Lucro Operacional (EBITDA)" value={dreData.operationalProfit} isTotal />

                                <ExpandableRow rowKey="taxes" label="(-) Impostos (Simples Nacional)" value={dreData.taxes} details={dreData.taxDetails} negative indent />
                                <ExpandableRow rowKey="fees" label="(-) Taxas (Administrativas/Cartão)" value={dreData.fees} details={dreData.feeDetails} negative indent />
                                <ExpandableRow rowKey="commissions" label="(-) Comissões (Vendedores)" value={dreData.commissions} details={dreData.commissionDetails} negative indent />
                                <ExpandableRow rowKey="variable" label="(-) Despesas Variáveis" value={dreData.variableExpenses} details={dreData.variableDetails} negative indent />

                                <div className="h-4 bg-gray-50/50" />

                                <div className="bg-primary p-8 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-3xl">trending_up</span>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black">LUCRO LÍQUIDO</h3>
                                            <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Resultado Final do Exercício</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black opacity-60 mb-1">MARGEM LÍQUIDA: {formatPercent(dreData.netProfit, dreData.grossRevenue)}</p>
                                        <p className="text-4xl font-black">{formatCurrency(dreData.netProfit)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

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
                                <h3 className="text-2xl font-black text-gray-800 mb-2">Taxas de Cartão</h3>
                                <p className="text-sm text-gray-400 mb-8">Gerencie as taxas descontadas pelas operadoras de cartão.</p>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4 rounded-l-2xl">Bandeira</th>
                                                <th className="px-6 py-4 italic">Débito (%)</th>
                                                <th className="px-6 py-4 italic">Crédito à Vista (%)</th>
                                                <th className="px-6 py-4 italic rounded-r-2xl">Parcelado (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {['Mastercard', 'Visa', 'Elo'].map(brand => (
                                                <tr key={brand} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-5 font-black text-gray-700">{brand}</td>
                                                    {['debit', 'credit_cash', 'credit_installments'].map(method => {
                                                        const fee = paymentFees.find(f => f.brand === brand && f.method === method);
                                                        return (
                                                            <td key={method} className="px-6 py-5">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={fee?.fee_percentage || 0}
                                                                    onChange={e => handleUpdateFee(fee?.id!, parseFloat(e.target.value))}
                                                                    className="w-24 p-2 bg-gray-50 border-none rounded-xl focus:bg-white focus:ring-4 ring-primary/10 transition-all font-bold text-gray-700"
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

                            {/* Recurrence option - only show for non-credit card payments and when not editing */}
                            {financialForm.payment_method !== 'credit_card' && !financialForm.id && (
                                <div className={`p-4 rounded-2xl border transition-all ${financialForm.isRecurring ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={financialForm.isRecurring || false}
                                            onChange={e => setFinancialForm({ ...financialForm, isRecurring: e.target.checked })}
                                            className="h-5 w-5 rounded-lg accent-amber-500"
                                        />
                                        <div>
                                            <span className="text-xs font-black text-gray-600 uppercase">Lançamento Recorrente</span>
                                            <p className="text-[10px] text-gray-400">Ex: Aluguel, Energia, Internet (repete a cada 30 dias)</p>
                                        </div>
                                    </label>
                                    {financialForm.isRecurring && (
                                        <div className="mt-4 flex items-center gap-4">
                                            <span className="text-xs font-bold text-gray-500">Repetir por</span>
                                            <input
                                                type="number"
                                                min="2"
                                                max="24"
                                                value={financialForm.recurrenceCount || 2}
                                                onChange={e => setFinancialForm({ ...financialForm, recurrenceCount: parseInt(e.target.value) })}
                                                className="w-20 p-3 border-none rounded-xl bg-white focus:ring-4 ring-amber-100 outline-none text-center font-bold"
                                            />
                                            <span className="text-xs font-bold text-gray-500">meses</span>
                                        </div>
                                    )}
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
                                <select
                                    value={(financialForm as any).category_id || ''}
                                    onChange={e => setFinancialForm({ ...financialForm, category_id: e.target.value })}
                                    className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione a Categoria</option>
                                    {categories
                                        .filter(c => (financialForm.type === 'receivable' ? c.type === 'income' : c.type === 'expense'))
                                        .filter(c => !c.parent_id) // Get parents first
                                        .map(parent => (
                                            <React.Fragment key={parent.id}>
                                                <option value={parent.id} className="font-bold">{parent.name}</option>
                                                {categories
                                                    .filter(sub => sub.parent_id === parent.id)
                                                    .map(sub => (
                                                        <option key={sub.id} value={sub.id}>
                                                            &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.name}
                                                        </option>
                                                    ))
                                                }
                                            </React.Fragment>
                                        ))
                                    }
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

                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" value={cardForm.brand || ''} onChange={e => setCardForm({ ...cardForm, brand: e.target.value })} placeholder="Bandeira (Ex: VISA)" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" />
                                <input type="text" maxLength={4} value={cardForm.last_4_digits || ''} onChange={e => setCardForm({ ...cardForm, last_4_digits: e.target.value })} placeholder="4 últimos dígitos" className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cor do Cartão</label>
                                <div className="flex gap-2 p-2">
                                    {['bg-green-600', 'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-orange-500', 'bg-gray-800'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setCardForm({ ...cardForm, color })}
                                            className={`h-8 w-8 rounded-full ${color} ${cardForm.color === color ? 'ring-4 ring-offset-2 ring-primary/30' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black shadow-xl">Salvar Cartão</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Closing Commissions Modal */}
            {isClosingModalOpen && selectedResellerForClosing && (() => {
                const pendingSales = sales.filter(s => s.reseller_id === selectedResellerForClosing.id && s.payment_status !== 'paid');
                const totalPendingGross = pendingSales.reduce((acc, s) => acc + (s.total_price || 0), 0);
                const totalPendingCommission = pendingSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0);
                const totalPendingNet = pendingSales.reduce((acc, s) => acc + s.net_amount, 0);

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                        <div className="bg-white w-full max-w-4xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800">Fechamento: {selectedResellerForClosing.name}</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Vendas Pendentes de Acerto</p>
                                </div>
                                <button onClick={() => setIsClosingModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1 whitespace-nowrap">Total Vendido</p>
                                    <p className="text-lg font-black text-blue-700 whitespace-nowrap">R$ {totalPendingGross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1 whitespace-nowrap">Total Comissões</p>
                                    <p className="text-lg font-black text-amber-700 whitespace-nowrap">R$ {totalPendingCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10">
                                    <p className="text-[10px] font-black text-primary uppercase mb-1 whitespace-nowrap">Total Líquido</p>
                                    <p className="text-lg font-black text-primary whitespace-nowrap">R$ {totalPendingNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                                            <th className="px-3 py-3 text-right">Vlr. Unit.</th>
                                            <th className="px-3 py-3 text-right">Bruto</th>
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
                                                    <td className="px-3 py-4 text-right font-medium text-gray-500">R$ {s.unit_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-3 py-4 text-right font-bold text-gray-700">R$ {s.total_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                                    onClick={() => handleExportPDF(selectedResellerForClosing, pendingSales, totalPendingGross, totalPendingCommission, totalPendingNet)}
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
                                <button type="button" onClick={() => setCategoryForm({ ...categoryForm, type: 'income', parent_id: undefined })} className={`py-4 rounded-2xl font-black transition-all ${categoryForm.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400'}`}>RECEITA</button>
                                <button type="button" onClick={() => setCategoryForm({ ...categoryForm, type: 'expense', parent_id: undefined })} className={`py-4 rounded-2xl font-black transition-all ${categoryForm.type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-400'}`}>DESPESA</button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Categoria Pai (Opcional)</label>
                                <select
                                    value={categoryForm.parent_id || ''}
                                    onChange={e => setCategoryForm({ ...categoryForm, parent_id: e.target.value || undefined })}
                                    className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:ring-4 ring-primary/10 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">Nenhuma (Esta é uma Categoria Pai)</option>
                                    {categories
                                        .filter(c => c.type === categoryForm.type && !c.parent_id && c.id !== categoryForm.id)
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))
                                    }
                                </select>
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
                                    <input type="email" value={editingClient?.email || ''} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} placeholder="Email Principal" className="p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" />
                                    <input type="text" value={editingClient?.whatsapp || ''} onChange={e => setEditingClient({ ...editingClient, whatsapp: e.target.value })} placeholder="WhatsApp" className="p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nascimento</span>
                                        <input type="date" value={editingClient?.birth_date || ''} onChange={setEditingClient && (e => setEditingClient({ ...editingClient, birth_date: e.target.value }))} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Check-in Sono</span>
                                        <input type="time" value={editingClient?.sleep_schedule || ''} onChange={setEditingClient && (e => setEditingClient({ ...editingClient, sleep_schedule: e.target.value }))} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" />
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
                        <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-800">{editingProduct?.id && products.some(p => p.id === editingProduct.id) ? 'Configurar SKU' : 'Novo SKU'}</h2>
                                <button onClick={() => setIsProductModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSaveProduct} className="space-y-4">
                                <input type="text" value={editingProduct?.id || ''} onChange={e => setEditingProduct({ ...editingProduct, id: e.target.value })} placeholder="ID Único / SKU (ex: ltn-200ml)" className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all disabled:opacity-30" disabled={!!editingProduct?.id && products.some(p => p.id === editingProduct.id)} required />
                                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} placeholder="Nome Comercial do Produto" className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Custo Unitário (R$)</span>
                                        <input type="number" step="0.01" value={editingProduct?.cost_price || 0} onChange={e => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) })} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">PVP (Venda R$)</span>
                                        <input type="number" step="0.01" value={editingProduct?.price || 0} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full p-4 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all" required />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <label className="block">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4">Estoque Inicial</span>
                                        <input type="number" value={editingProduct?.initial_stock || 0} onChange={e => setEditingProduct({ ...editingProduct, initial_stock: parseInt(e.target.value) })} className="w-full p-4 border-none rounded-2xl bg-white mt-1" required />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4">Data Inicial</span>
                                        <input type="date" value={editingProduct?.initial_stock_date || ''} onChange={e => setEditingProduct({ ...editingProduct, initial_stock_date: e.target.value })} className="w-full p-4 border-none rounded-2xl bg-white mt-1" required />
                                    </label>
                                    <label className="block col-span-2 mt-2">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4">Data de Vencimento</span>
                                        <input type="date" value={editingProduct?.expiration_date || ''} onChange={e => setEditingProduct({ ...editingProduct, expiration_date: e.target.value })} className="w-full p-4 border-none rounded-2xl bg-white mt-1" />
                                    </label>
                                </div>

                                {editingProduct?.id && products.some(p => p.id === editingProduct.id) && (
                                    <label className="block">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Estoque Atual (Somente Visualização)</span>
                                        <input type="number" value={editingProduct?.stock_quantity || 0} className="w-full p-4 border-none rounded-2xl bg-gray-100 mt-1" disabled />
                                        <p className="text-[10px] text-gray-400 mt-2 px-4 italic">* Para alterar o estoque use o botão "Movimentar Estoque"</p>
                                    </label>
                                )}

                                <div className="flex space-x-4 pt-4">
                                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors">Voltar</button>
                                    <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all">Confirmar Registro</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Stock Movement Modal */}
            {isMovementModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black text-gray-800">Movimentar Estoque</h2>
                            <button onClick={() => setIsMovementModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveMovement} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Produto</label>
                                <select
                                    value={movementForm.product_id || ''}
                                    onChange={e => setMovementForm({ ...movementForm, product_id: e.target.value })}
                                    className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">Selecione o Produto</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Saldo: {p.stock_quantity})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setMovementForm({ ...movementForm, type: 'purchase' })} className={`py-4 rounded-2xl font-black transition-all ${movementForm.type === 'purchase' ? 'bg-primary text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                                    🛒 COMPRA
                                </button>
                                <button type="button" onClick={() => setMovementForm({ ...movementForm, type: 'adjustment' })} className={`py-4 rounded-2xl font-black transition-all ${movementForm.type === 'adjustment' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                                    📉 BAIXA
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Quantidade</span>
                                    <input type="number" min="1" value={movementForm.quantity || 0} onChange={e => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none" required />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Data</span>
                                    <input type="date" value={movementForm.movement_date || ''} onChange={e => setMovementForm({ ...movementForm, movement_date: e.target.value })} className="w-full p-5 border-none rounded-2xl bg-gray-50 mt-1 focus:bg-white focus:ring-4 ring-primary/10 outline-none" required />
                                </label>
                            </div>

                            {movementForm.type === 'purchase' ? (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-4">Custo Unitário da Compra (R$)</label>
                                        <input type="number" step="0.01" value={movementForm.unit_cost || 0} onChange={e => setMovementForm({ ...movementForm, unit_cost: parseFloat(e.target.value) })} className="w-full p-5 border-none rounded-2xl bg-primary/5 focus:bg-white focus:ring-4 ring-primary/10 outline-none font-bold text-primary" placeholder="0,00" required={movementForm.type === 'purchase'} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-4">Data de Vencimento do Lote</label>
                                        <input type="date" value={movementForm.expiration_date || ''} onChange={e => setMovementForm({ ...movementForm, expiration_date: e.target.value })} className="w-full p-5 border-none rounded-2xl bg-primary/5 focus:bg-white focus:ring-4 ring-primary/10 outline-none font-bold text-primary" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 px-4 mt-2 italic">* O custo médio e a data de vencimento do produto serão atualizados.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-4">Motivo da Baixa</label>
                                    <select
                                        value={movementForm.reason || ''}
                                        onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                                        className="w-full p-5 border-none rounded-2xl bg-red-50 focus:bg-white focus:ring-4 ring-red-100 outline-none appearance-none cursor-pointer"
                                        required={movementForm.type === 'adjustment'}
                                    >
                                        <option value="">Selecione o Motivo</option>
                                        <option value="perda">Perda / Avaria</option>
                                        <option value="uso_proprio">Uso Próprio</option>
                                        <option value="brinde">Brinde / Amostra</option>
                                        <option value="vencimento">Vencimento</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex space-x-6 pt-6">
                                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-[2] bg-primary text-white py-5 rounded-[20px] font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all">Registrar Movimentação</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                                onChange={e => setSaleForm({ ...saleForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                                                className="w-full p-5 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all font-bold text-red-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Forma de Pagamento</label>
                                        <select
                                            value={saleForm.payment_method || ''}
                                            onChange={e => setSaleForm({ ...saleForm, payment_method: e.target.value, installments: 1 })}
                                            className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                            required
                                        >
                                            <option value="pix">📱 Pix</option>
                                            <option value="dinheiro">💵 Dinheiro</option>
                                            <option value="cartão_crédito">💳 Cartão de Crédito</option>
                                            <option value="cartão_débito">💳 Cartão de Débito</option>
                                            <option value="prazo">⏳ A Prazo / Fiado</option>
                                        </select>
                                    </div>

                                    {saleForm.payment_method?.includes('cartão') && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Bandeira</label>
                                                <select
                                                    value={saleForm.card_brand || ''}
                                                    onChange={e => setSaleForm({ ...saleForm, card_brand: e.target.value })}
                                                    className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                                    required
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="Mastercard">Mastercard</option>
                                                    <option value="Visa">Visa</option>
                                                    <option value="Elo">Elo</option>
                                                    <option value="Outros">Outros</option>
                                                </select>
                                            </div>
                                            {saleForm.payment_method === 'cartão_crédito' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Parcelas</label>
                                                    <select
                                                        value={saleForm.installments || 1}
                                                        onChange={e => setSaleForm({ ...saleForm, installments: parseInt(e.target.value) })}
                                                        className="w-full p-4 border-none rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 ring-primary/10 outline-none transition-all"
                                                    >
                                                        {[...Array(12)].map((_, i) => (
                                                            <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-bold">Total Bruto:</span>
                                        <span className="font-black text-gray-800">R$ {saleForm.total_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {saleForm.discount_amount! > 0 && (
                                        <div className="flex justify-between items-center text-red-500 text-sm">
                                            <span className="font-bold">{saleForm.reseller_id ? 'Comissão' : 'Desconto'} ({saleForm.discount_percentage}%):</span>
                                            <span className="font-black">- R$ {saleForm.discount_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {saleForm.card_fee_amount! > 0 && (
                                        <div className="flex justify-between items-center text-amber-600 text-sm">
                                            <span className="font-bold">Taxa Cartão ({saleForm.card_fee_percent}%):</span>
                                            <span className="font-black">- R$ {saleForm.card_fee_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-4 border-t border-primary/20">
                                        <span className="text-primary font-black text-xl">Líquido Final:</span>
                                        <div className="text-right">
                                            <span className="text-primary font-black text-2xl block">R$ {saleForm.net_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            {saleForm.installments! > 1 && (
                                                <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">{saleForm.installments}x de R$ {((saleForm.total_price || 0) / saleForm.installments!).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            )}
                                        </div>
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

            {/* Bulk Edit Sales Modal */}
            {isBulkEditModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">Editar em Lote</h2>
                                <p className="text-xs text-gray-400 mt-1">{selectedSales.size} vendas selecionadas</p>
                            </div>
                            <button onClick={() => setIsBulkEditModalOpen(false)} className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecione os campos para alterar:</p>

                            {/* Data da Venda */}
                            <div className={`p-4 rounded-2xl border transition-all ${bulkEditForm.updateSaleDate ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkEditForm.updateSaleDate}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, updateSaleDate: e.target.checked })}
                                        className="h-5 w-5 rounded-lg accent-blue-500"
                                    />
                                    <span className="text-xs font-black text-gray-600 uppercase">Data da Venda</span>
                                </label>
                                {bulkEditForm.updateSaleDate && (
                                    <input
                                        type="date"
                                        value={bulkEditForm.sale_date}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, sale_date: e.target.value })}
                                        className="w-full mt-3 p-4 border-none rounded-xl bg-white focus:ring-4 ring-blue-100 outline-none"
                                    />
                                )}
                            </div>

                            {/* Data de Vencimento */}
                            <div className={`p-4 rounded-2xl border transition-all ${bulkEditForm.updateDueDate ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkEditForm.updateDueDate}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, updateDueDate: e.target.checked })}
                                        className="h-5 w-5 rounded-lg accent-blue-500"
                                    />
                                    <span className="text-xs font-black text-gray-600 uppercase">Data de Vencimento</span>
                                </label>
                                {bulkEditForm.updateDueDate && (
                                    <input
                                        type="date"
                                        value={bulkEditForm.due_date}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, due_date: e.target.value })}
                                        className="w-full mt-3 p-4 border-none rounded-xl bg-white focus:ring-4 ring-blue-100 outline-none"
                                    />
                                )}
                            </div>

                            {/* Status */}
                            <div className={`p-4 rounded-2xl border transition-all ${bulkEditForm.updateStatus ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkEditForm.updateStatus}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, updateStatus: e.target.checked })}
                                        className="h-5 w-5 rounded-lg accent-blue-500"
                                    />
                                    <span className="text-xs font-black text-gray-600 uppercase">Status de Pagamento</span>
                                </label>
                                {bulkEditForm.updateStatus && (
                                    <select
                                        value={bulkEditForm.payment_status}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, payment_status: e.target.value })}
                                        className="w-full mt-3 p-4 border-none rounded-xl bg-white focus:ring-4 ring-blue-100 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Selecione o Status</option>
                                        <option value="pending">⏳ Pendente</option>
                                        <option value="paid">✅ Pago</option>
                                        <option value="overdue">⚠️ Atrasado</option>
                                    </select>
                                )}
                            </div>

                            {/* Revendedor */}
                            <div className={`p-4 rounded-2xl border transition-all ${bulkEditForm.updateReseller ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkEditForm.updateReseller}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, updateReseller: e.target.checked })}
                                        className="h-5 w-5 rounded-lg accent-blue-500"
                                    />
                                    <span className="text-xs font-black text-gray-600 uppercase">Revendedor</span>
                                </label>
                                {bulkEditForm.updateReseller && (
                                    <select
                                        value={bulkEditForm.reseller_id}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, reseller_id: e.target.value })}
                                        className="w-full mt-3 p-4 border-none rounded-xl bg-white focus:ring-4 ring-blue-100 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Venda Direta (Sem Revendedor)</option>
                                        {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="flex space-x-4 pt-6">
                            <button
                                type="button"
                                onClick={() => setIsBulkEditModalOpen(false)}
                                className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkEditSales}
                                className="flex-[2] bg-blue-500 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">check</span>
                                Aplicar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminDashboard;

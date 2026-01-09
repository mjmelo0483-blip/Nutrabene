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

const AdminDashboard: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [settings, setSettings] = useState<ReminderSettings>({ message_template: '' });
    const [uploading, setUploading] = useState(false);
    const [dataError, setDataError] = useState('');

    // Modal State for CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<Registration> | null>(null);

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
        if (regError) setDataError(`Erro ao carregar clientes: ${regError.message}`);
        if (settError) setDataError(prev => prev ? `${prev} | ${settError.message}` : `Erro ao carregar configurações: ${settError.message}`);
        if (regs) setRegistrations(regs);
        if (sett) setSettings(sett);
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
                                <span className="material-symbols-outlined text-sm mr-1">add</span> Incluir Cliente
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
            </div>

            {/* CRUD Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">{editingClient?.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                        <form onSubmit={handleSaveClient} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Nome Completo</label>
                                    <input type="text" value={editingClient?.name || ''} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">E-mail</label>
                                    <input type="email" value={editingClient?.email || ''} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">WhatsApp</label>
                                    <input type="text" value={editingClient?.whatsapp || ''} onChange={e => setEditingClient({ ...editingClient, whatsapp: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="(00) 00000-0000" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Data de Nascimento</label>
                                    <input type="date" value={editingClient?.birth_date || ''} onChange={e => setEditingClient({ ...editingClient, birth_date: e.target.value })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Horário do Sono</label>
                                    <input type="time" value={editingClient?.sleep_schedule || ''} onChange={e => setEditingClient({ ...editingClient, sleep_schedule: e.target.value })} className="w-full p-3 border rounded-xl" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Local de Compra</label>
                                    <select value={editingClient?.purchase_location || 'site_oficial'} onChange={e => setEditingClient({ ...editingClient, purchase_location: e.target.value })} className="w-full p-3 border rounded-xl">
                                        <option value="site_oficial">Site Oficial</option>
                                        <option value="farmacia">Farmácia</option>
                                        <option value="clinica">Clínica</option>
                                        <option value="revendedor">Revendedor</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex space-x-4 mt-8">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingClient(null); }} className="flex-1 py-4 border rounded-xl font-bold text-gray-500">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

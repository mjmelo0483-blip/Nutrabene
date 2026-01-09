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

    const [dataError, setDataError] = useState('');

    async function fetchData() {
        setDataError('');
        const { data: regs, error: regError } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
        const { data: sett, error: settError } = await supabase.from('reminder_settings').select('message_template, media_url').eq('key', 'default').single();

        if (regError) setDataError(`Erro ao carregar clientes: ${regError.message}`);
        if (settError) setDataError(prev => prev ? `${prev} | ${settError.message}` : `Erro ao carregar configurações: ${settError.message}`);

        if (regs) setRegistrations(regs);
        if (sett) setSettings(sett);
    }

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
                        <div className="p-8 border-b">
                            <h2 className="text-xl font-bold">Clientes Cadastrados ({registrations.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Nome</th>
                                        <th className="px-6 py-4">WhatsApp</th>
                                        <th className="px-6 py-4">Sono</th>
                                        <th className="px-6 py-4">Local</th>
                                        <th className="px-6 py-4">Data</th>
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
                                            <td className="px-6 py-4">{reg.purchase_location}</td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(reg.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

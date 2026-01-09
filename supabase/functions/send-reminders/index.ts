import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? "";
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "";
        const zapiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID') ?? "";
        const zapiToken = Deno.env.get('ZAPI_TOKEN') ?? "";
        const zapiClientToken = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? "";

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch dynamic settings
        const { data: settings } = await supabase
            .from('reminder_settings')
            .select('*')
            .eq('key', 'default')
            .single();

        const messageTemplate = settings?.message_template || "Não esqueça de usar seu Tônico Nutrabene hoje!";
        const mediaUrl = settings?.media_url;
        const mediaType = settings?.media_type;

        // Get current Brazil time (BRT)
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour')?.value;
        const minute = parts.find(p => p.type === 'minute')?.value;
        const currentTimeStr = `${hour}:${minute}`;

        // Today in BRT
        const dateParts = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(now);
        const year = dateParts.find(p => p.type === 'year')?.value;
        const month = dateParts.find(p => p.type === 'month')?.value;
        const day = dateParts.find(p => p.type === 'day')?.value;
        const todayStr = `${year}-${month}-${day}`;

        console.log(`[BRT Time] ${currentTimeStr} | [Date] ${todayStr}`);

        const { data: users, error: fetchError } = await supabase
            .from('registrations')
            .select('*')
            .eq('sleep_schedule', currentTimeStr)
            .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${todayStr}T00:00:00Z`);

        if (fetchError) throw fetchError;

        console.log(`Found ${users?.length || 0} users to remind.`);

        const results = [];

        for (const user of users || []) {
            let whatsapp = user.whatsapp.replace(/\D/g, '');
            if (whatsapp.length === 10 || whatsapp.length === 11) {
                whatsapp = '55' + whatsapp;
            }
            const name = user.name.split(' ')[0];
            const finalizedMessage = messageTemplate.replace('{nome}', name);

            console.log(`Sending reminder to ${user.email} (${whatsapp})...`);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (zapiClientToken) headers['Client-Token'] = zapiClientToken;

            let response;
            if (mediaUrl) {
                // Use Z-API image or file endpoint
                const endpoint = mediaType === 'image' ? 'send-image' : 'send-document';
                const body: any = {
                    phone: whatsapp,
                    caption: finalizedMessage,
                };
                if (mediaType === 'image') {
                    body.image = mediaUrl;
                } else {
                    body.document = mediaUrl;
                    body.fileName = 'Nutrabene-Dica.pdf';
                }

                response = await fetch(`https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/${endpoint}`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(body),
                });
            } else {
                response = await fetch(`https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ phone: whatsapp, message: finalizedMessage }),
                });
            }

            if (response.ok) {
                console.log(`Successfully sent to ${user.email}`);
                await supabase
                    .from('registrations')
                    .update({ last_reminder_sent_at: new Date().toISOString() })
                    .eq('id', user.id);

                results.push({ user: user.email, status: 'success' });
            } else {
                const zapiResult = await response.json();
                console.error(`Failed to send to ${user.email}:`, zapiResult);
                results.push({ user: user.email, status: 'failed', error: zapiResult });
            }
        }

        return new Response(JSON.stringify({ processed: results.length, details: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(`Global error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

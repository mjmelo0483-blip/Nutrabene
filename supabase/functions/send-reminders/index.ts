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

        // Allow manual trigger for testing via POST body
        let manualTime: string | null = null;
        if (req.method === 'POST') {
            try {
                const body = await req.json();
                manualTime = body.time || null;
                console.log(`[Manual Trigger] Received time: ${manualTime}`);
            } catch (e) {
                // Ignore parse errors for empty bodies
            }
        }

        // Fetch dynamic settings
        const { data: settings, error: settingsError } = await supabase
            .from('reminder_settings')
            .select('*')
            .eq('key', 'default')
            .single();

        if (settingsError) {
            console.error(`[Settings Error] ${settingsError.message}`);
        }

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

        // Final time to use for query
        const currentTimeStr = manualTime || `${hour}:${minute}`;

        // Today in BRT for comparison
        const dateParts = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(now);
        const y = dateParts.find(p => p.type === 'year')?.value;
        const m = dateParts.find(p => p.type === 'month')?.value;
        const d = dateParts.find(p => p.type === 'day')?.value;
        const todayStr = `${y}-${m}-${d}`;

        console.log(`[Execution] Target Time: ${currentTimeStr} | Date: ${todayStr} | Manual: ${!!manualTime}`);

        // Querying users
        const { data: users, error: fetchError } = await supabase
            .from('registrations')
            .select('*')
            .eq('sleep_schedule', currentTimeStr)
            .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${todayStr}T00:00:00Z`);

        if (fetchError) {
            console.error(`[Fetch Error] ${fetchError.message}`);
            throw fetchError;
        }

        console.log(`[Query Result] Found ${users?.length || 0} users for time ${currentTimeStr}`);

        const results = [];

        for (const user of users || []) {
            let whatsapp = user.whatsapp.replace(/\D/g, '');
            // Simple normalization for Brazil
            if (whatsapp.length === 10 || whatsapp.length === 11) {
                whatsapp = '55' + whatsapp;
            }

            const name = user.name.split(' ')[0];
            const finalizedMessage = messageTemplate.replace('{nome}', name);

            console.log(`[Sending] User: ${user.email} | Phone: ${whatsapp}`);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (zapiClientToken) headers['Client-Token'] = zapiClientToken;

            let response;
            let zapiEndpoint;
            let payload;

            if (mediaUrl) {
                const endpoint = mediaType === 'image' ? 'send-image' : 'send-document';
                zapiEndpoint = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/${endpoint}`;
                payload = { phone: whatsapp, caption: finalizedMessage };
                if (mediaType === 'image') {
                    (payload as any).image = mediaUrl;
                } else {
                    (payload as any).document = mediaUrl;
                    (payload as any).fileName = 'Nutrabene-Dica.pdf';
                }
            } else {
                zapiEndpoint = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`;
                payload = { phone: whatsapp, message: finalizedMessage };
            }

            try {
                response = await fetch(zapiEndpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload),
                });

                const zapiResult = await response.json();

                if (response.ok) {
                    console.log(`[Success] Sent to ${user.email}`);
                    const { error: updateError } = await supabase
                        .from('registrations')
                        .update({ last_reminder_sent_at: new Date().toISOString() })
                        .eq('id', user.id);

                    if (updateError) {
                        console.error(`[Update Error] Failed to update timestamp for ${user.email}: ${updateError.message}`);
                    }

                    results.push({ user: user.email, status: 'success', zapi: zapiResult });
                } else {
                    console.error(`[Z-API Error] ${user.email}:`, zapiResult);
                    results.push({ user: user.email, status: 'failed', error: zapiResult });
                }
            } catch (err) {
                console.error(`[Fetch Fatal] ${user.email}: ${err.message}`);
                results.push({ user: user.email, status: 'error', message: err.message });
            }
        }

        return new Response(JSON.stringify({
            processed: results.length,
            time: currentTimeStr,
            date: todayStr,
            details: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(`[Global Error] ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

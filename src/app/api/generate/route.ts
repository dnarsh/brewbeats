import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { REASONING_MODELS } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, currentComposition } = body;

    const apiKey = process.env.LOCAL_ENGINE_API_KEY || process.env.NVIDIA_API_KEY;
    let model = body.model || process.env.LOCAL_ENGINE_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-4-maverick-17b-128e-instruct';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Local AI engine not configured on the server.' },
        { status: 500 }
      );
    }

    // Hide vendor branding: map "local/" prefix back to "nvidia/" for the actual API call
    // but only for the models we renamed (not the original local/nano-9b-v2)
    if (model.startsWith('local/') && model !== 'local/nano-9b-v2') {
      model = model.replace('local/', 'nvidia/');
    }

    let systemContent = SYSTEM_PROMPT;
    if (currentComposition) {
      systemContent += `\n\nCURRENT COMPOSITION:\n\`\`\`json\n${JSON.stringify(currentComposition)}\n\`\`\`\nUSE PATCH MODE for modifications. Only return a {"_patch":true,...} object with the changes. Do NOT regenerate the full composition. If the user wants a completely new/different composition, return a full composition instead.`;
    }

    const apiMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const isReasoningModel = REASONING_MODELS.has(model);
    const isQwen = model.includes('qwen');

    const requestBody: Record<string, unknown> = {
      model,
      messages: apiMessages,
      temperature: isReasoningModel ? 0.6 : 0.7,
      top_p: 0.95,
      max_tokens: 32768,
      stream: true,
    };

    // Disable thinking mode — it adds huge latency for structured JSON output
    if (isQwen && isReasoningModel) {
      requestBody.chat_template_kwargs = { enable_thinking: false };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Local Engine error:', response.status, errorText);
      return NextResponse.json(
        { error: `Local Engine error: ${response.status}` },
        { status: response.status }
      );
    }

    // Forward SSE stream directly to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Forward raw SSE chunks from Local Engine
            ctrl.enqueue(encoder.encode(decoder.decode(value, { stream: true })));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Stream error';
          ctrl.enqueue(encoder.encode(`data: {"error":"${msg}"}\n\n`));
        }

        ctrl.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'Request timed out. Try a faster model.' }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

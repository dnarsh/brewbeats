import { NextRequest, NextResponse } from 'next/server';
import { ADVISOR_PROMPT } from '@/lib/advisor-prompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { composition, question, lockedRejections, conversationHistory } = body;

    const apiKey = process.env.LOCAL_ENGINE_API_KEY || process.env.NVIDIA_API_KEY;
    let model = body.model || process.env.LOCAL_ENGINE_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-4-maverick-17b-128e-instruct';

    const usePollinations = !apiKey || model.startsWith('pollinations/');
    if (usePollinations) {
      model = model.replace('pollinations/', '') || 'openai';
    }

    if (model.startsWith('local/') && model !== 'local/nano-9b-v2') {
      model = model.replace('local/', 'nvidia/');
    }

    let systemContent = ADVISOR_PROMPT + `\n\nCURRENT COMPOSITION:\n\`\`\`json\n${JSON.stringify(composition)}\n\`\`\``;
    if (lockedRejections && lockedRejections.length > 0) {
      systemContent += `\n\nUSER BOUNDARIES — DO NOT suggest changes to these (user permanently rejected them):\n${JSON.stringify(lockedRejections)}`;
    }

    // Build messages with conversation history for session memory
    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemContent },
    ];
    // Add previous conversation (last 6 messages for context window efficiency)
    if (Array.isArray(conversationHistory)) {
      const recent = conversationHistory.slice(-6);
      for (const msg of recent) {
        if (msg.role === 'user') apiMessages.push({ role: 'user', content: msg.content });
        else if (msg.role === 'assistant') apiMessages.push({ role: 'assistant', content: msg.content });
      }
    }
    apiMessages.push({ role: 'user', content: question });

    const requestBody = {
      model,
      messages: apiMessages,
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 8192,
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const apiUrl = usePollinations
      ? 'https://gen.pollinations.ai/v1/chat/completions'
      : 'https://integrate.api.nvidia.com/v1/chat/completions';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!usePollinations && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Advisor error:', response.status, errorText);
      return NextResponse.json({ error: `Advisor error: ${response.status}` }, { status: response.status });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
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
    console.error('Advisor error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

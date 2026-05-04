export const prerender = false;

import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

const BOAT_CONTEXT = `Rocky Ocean er en 36-fots seilbåt (NOR 11782) med ORC Club Non-Spinnaker-sertifikat. Båten seiler ut fra Norge og deltar i kappseiling og langtur. Instagram-kontoen handler om seillivet, vedlikehold, racing og opplevelser til havs.`;

export const POST: APIRoute = async ({ request }) => {
  const { topic, extra } = await request.json();

  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API-nøkkel mangler i .env', { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `${BOAT_CONTEXT}

Generer 5 kreative og engasjerende Instagram-innholdsideer om temaet: "${topic}"
${extra ? `\nEkstra kontekst: ${extra}` : ''}

For hvert innlegg, bruk dette formatet:

**Innlegg [nummer]: [Tittel]**
📸 Bilde: [konkret beskrivelse av motiv/komposisjon]
✍️ Tekst: [ferdig bildetekst på norsk, 2-4 setninger, engasjerende og autentisk]
#️⃣ Emneknagger: [8-12 relevante hashtags]
🕐 Beste tidspunkt: [dag og klokkeslett]

Vær kreativ og autentisk. Skriv på norsk.`;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

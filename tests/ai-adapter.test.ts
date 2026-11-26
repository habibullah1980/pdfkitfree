import assert from 'node:assert/strict';

async function main() {
  delete process.env.AI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.AI_PROVIDER = 'mock_local';
  const { AiProviderAdapter, AiUnavailableError } = await import('../src/lib/server/ai-adapter');
  const msgs = [{ role: 'user' as const, content: 'Summarize this' }];
  const doc = { text: 'This agreement is between Acme and Beta.', fileName: 'a.pdf' };

  // 1. No provider configured: a clear error, never a canned answer.
  await assert.rejects(new AiProviderAdapter().generateCompletion(msgs, doc, 'summarize'), AiUnavailableError);

  // 2. Placeholder key from .env.example is treated as not configured.
  process.env.AI_PROVIDER = 'openai';
  process.env.AI_API_KEY = 'sk-replace_with_openai_api_key';
  await assert.rejects(new AiProviderAdapter().generateCompletion(msgs, doc), /not available/);

  // 3. Provider failure: error, not a fallback answer.
  process.env.AI_API_KEY = 'sk-test-key';
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 })) as typeof fetch;
  const origError = console.error;
  console.error = () => undefined;
  try {
    await assert.rejects(new AiProviderAdapter().generateCompletion(msgs, doc), /did not respond/);

    // 4. Provider success: the provider's answer is returned as-is.
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'Acme and Beta (Page 1).' } }], usage: { total_tokens: 33 } }), { status: 200 })) as typeof fetch;
    const r = await new AiProviderAdapter().generateCompletion(msgs, doc);
    assert.equal(r.text, 'Acme and Beta (Page 1).');
    assert.equal(r.provider, 'openai');
    assert.equal(r.tokensUsed, 33);
  } finally {
    globalThis.fetch = realFetch;
    console.error = origError;
  }
  console.log('ai-adapter: all checks passed');
}
main().catch((e) => { console.error(e); process.exit(1); });

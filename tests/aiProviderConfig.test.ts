import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAiProviderConfig,
  OPENROUTER_DEFAULT_MODEL,
} from '../supabase/functions/_shared/aiProviderConfig';

test('OpenRouter is selected before Gemini when both keys exist', () => {
  const config = getAiProviderConfig({
    OPENROUTER_API_KEY: 'openrouter-key',
    OPENROUTER_MODEL: 'anthropic/claude-test',
    GEMINI_API_KEY: 'gemini-key',
  });

  assert.deepEqual(config, {
    provider: 'openrouter',
    apiKey: 'openrouter-key',
    model: 'anthropic/claude-test',
  });
});

test('OpenRouter uses a sensible default model', () => {
  const config = getAiProviderConfig({ OPENROUTER_API_KEY: 'openrouter-key' });

  assert.deepEqual(config, {
    provider: 'openrouter',
    apiKey: 'openrouter-key',
    model: OPENROUTER_DEFAULT_MODEL,
  });
});

test('Gemini remains available as fallback', () => {
  const config = getAiProviderConfig({ GEMINI_API_KEY: 'gemini-key' });

  assert.deepEqual(config, {
    provider: 'gemini',
    apiKey: 'gemini-key',
    model: 'gemini-1.5-flash',
  });
});

test('missing keys returns null', () => {
  assert.equal(getAiProviderConfig({}), null);
});

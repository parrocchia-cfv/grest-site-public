import test from 'node:test';
import assert from 'node:assert/strict';
import type { Module } from '@/types/module';
import { sanitizeResponsesBySchema } from '@/lib/sanitize-responses-by-schema';

const moduleSchema: Module = {
  id: 'mod-1',
  version: 1,
  meta: {
    title: { it: 'Test' },
    description: { it: 'Test' },
    thankYou: { title: { it: 'ok' }, body: { it: 'ok' }, notes: { it: 'ok' } },
  },
  steps: [
    {
      id: 'step-anagrafica',
      title: { it: 'Anagrafica' },
      fields: [
        {
          id: 'num_figli',
          type: 'number',
          label: { it: 'N figli' },
          required: true,
        },
      ],
    },
    {
      id: 'step-figli',
      title: { it: 'Figli' },
      repeatFromField: { countFieldId: 'num_figli', minCount: 1, maxCount: 5 },
      fields: [
        {
          id: 'terza',
          type: 'radio',
          label: { it: 'Terza settimana?' },
          required: true,
          options: [
            { value: 'si', label: { it: 'Si' } },
            { value: 'no', label: { it: 'No' } },
          ],
        },
        {
          id: 'uscite_1_2',
          type: 'checkbox-group',
          label: { it: 'Uscite 1-2' },
          required: false,
          options: [
            { value: 'base', label: { it: 'Base' } },
            {
              value: '01_1',
              label: { it: 'Parco' },
              enabledIf: { field: 'terza', op: 'eq', value: 'si' },
            },
            {
              value: '02_1',
              label: { it: 'Museo' },
              enabledIf: { field: 'terza', op: 'eq', value: 'si' },
            },
          ],
        },
      ],
    },
  ],
};

test('regressione: terza_0=no rimuove 01_1', () => {
  const { responses, removed } = sanitizeResponsesBySchema(moduleSchema, {
    num_figli: 1,
    terza_0: 'no',
    uscite_1_2_0: ['base', '01_1'],
  });
  assert.deepEqual(responses.uscite_1_2_0, ['base']);
  assert.deepEqual(removed, [{ fieldId: 'uscite_1_2_0', value: '01_1' }]);
});

test('caso positivo: terza_0=si mantiene 01_1', () => {
  const { responses, removed } = sanitizeResponsesBySchema(moduleSchema, {
    num_figli: 1,
    terza_0: 'si',
    uscite_1_2_0: ['base', '01_1'],
  });
  assert.deepEqual(responses.uscite_1_2_0, ['base', '01_1']);
  assert.equal(removed.length, 0);
});

test('checkbox-group misto: conserva solo validi', () => {
  const { responses, removed } = sanitizeResponsesBySchema(moduleSchema, {
    num_figli: 1,
    terza_0: 'no',
    uscite_1_2_0: ['01_1', 'base', 'non-esiste'],
  });
  assert.deepEqual(responses.uscite_1_2_0, ['base']);
  assert.deepEqual(
    removed,
    [
      { fieldId: 'uscite_1_2_0', value: '01_1' },
      { fieldId: 'uscite_1_2_0', value: 'non-esiste' },
    ]
  );
});

test('repeat 3 figli: sanitizzazione indipendente per _0,_1,_2', () => {
  const { responses } = sanitizeResponsesBySchema(moduleSchema, {
    num_figli: 3,
    terza_0: 'si',
    terza_1: 'no',
    terza_2: 'si',
    uscite_1_2_0: ['base', '01_1'],
    uscite_1_2_1: ['base', '01_1'],
    uscite_1_2_2: ['base', '02_1'],
  });
  assert.deepEqual(responses.uscite_1_2_0, ['base', '01_1']);
  assert.deepEqual(responses.uscite_1_2_1, ['base']);
  assert.deepEqual(responses.uscite_1_2_2, ['base', '02_1']);
});

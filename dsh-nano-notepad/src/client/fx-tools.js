/**
 * fx-tools.js — note_* host-tool set for the one-shot engine (§10.2)。
 *
 * Tools are host-side executors handed to createFxEngine via `tools`:
 * { note_read: {name, description, inputSchema, execute, idempotent} }.
 * `toolContext` carries { corpus } — the notepad IDB five-kind corpus handle.
 * All writes land in IDB via corpus; credentials never leave the bridge/host.
 */

export function noteToolSchemas() {
  return {
    note_read: {
      name: 'note_read',
      description: 'Read one note/corpus entry by id, or by (kind,name). Returns {id,kind,name,content,meta}.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['prompt', 'note', 'draft', 'knowledge', 'memory'] },
          name: { type: 'string' },
        },
      },
      idempotent: true,
    },
    note_write: {
      name: 'note_write',
      description: 'Write a corpus entry. kind=draft|knowledge only (machine-produced). Returns {id,kind,supersedes?}.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['draft', 'knowledge'] },
          name: { type: 'string' },
          content: { type: 'string' },
          supersedes: { type: 'string', description: 'optional id this artifact supersedes' },
          via: { type: 'object', description: 'provenance {promptId,runId,epochId,at}' },
        },
        required: ['kind', 'content'],
      },
      idempotent: false,
    },
    note_kind_get: {
      name: 'note_kind_get',
      description: 'List corpus entries by kind. Returns [{id,kind,name,createdAt}] newest-first, capped.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['prompt', 'note', 'draft', 'knowledge', 'memory'] },
          limit: { type: 'number' },
        },
        required: ['kind'],
      },
      idempotent: true,
    },
    note_search: {
      name: 'note_search',
      description: 'Search corpus by substring across name+content. Returns [{id,kind,name,excerpt}] capped.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          kind: { type: 'string', enum: ['prompt', 'note', 'draft', 'knowledge', 'memory'] },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
      idempotent: true,
    },
  }
}

/**
 * Build the tools object createFxEngine consumes, bound to a corpus handle.
 * @param {{ corpus: any }} toolContext
 */
export function buildNoteTools(toolContext) {
  const corpus = toolContext?.corpus
  const schemas = noteToolSchemas()
  const exec = (fn) => async (input, ctx) => {
    try {
      return await fn(input ?? {}, ctx ?? {})
    } catch (error) {
      return { content: String(error?.message ?? error), isError: true }
    }
  }
  return {
    note_read: {
      ...schemas.note_read,
      execute: exec(async (input) => {
        if (!corpus) throw new Error('corpus unavailable')
        return await corpus.read(input)
      }),
    },
    note_write: {
      ...schemas.note_write,
      execute: exec(async (input) => {
        if (!corpus) throw new Error('corpus unavailable')
        return await corpus.write(input)
      }),
    },
    note_kind_get: {
      ...schemas.note_kind_get,
      execute: exec(async (input) => {
        if (!corpus) throw new Error('corpus unavailable')
        return await corpus.kindGet(input)
      }),
    },
    note_search: {
      ...schemas.note_search,
      execute: exec(async (input) => {
        if (!corpus) throw new Error('corpus unavailable')
        return await corpus.search(input)
      }),
    },
  }
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../../db/schema';
import { DRIZZLE } from '../../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { OpenRouterService, type LlmMessage } from './openrouter.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { QdrantService } from '../rag/qdrant.service';

const BASE_SYSTEM_PROMPT = `
You are Cube AI, an AI-powered maintenance assistant for field-service technicians, engineers, maintenance teams, and authorized clients.

Your primary purpose is to help users understand, troubleshoot, inspect, operate, maintain, and service equipment using the technical documentation provided by their organization.

You specialize in maintenance domains such as:
- HVAC
- Elevators and escalators
- Generators
- Solar systems
- Fire safety systems
- Electrical equipment
- Industrial machinery
- Building systems
- Other technical equipment documented by the organization

Your answers must prioritize accuracy, safety, and traceability over being conversational or speculative.

# 1. SOURCE OF TRUTH

The organization's uploaded documents are the primary source of truth.

Retrieved documents may include:
- Equipment manuals
- Maintenance manuals
- Installation manuals
- Service bulletins
- Technical specifications
- Troubleshooting guides
- Inspection procedures
- Safety procedures
- Wiring and technical documentation

When relevant retrieved information is available, answer from that information.

Do NOT invent:
- Maintenance procedures
- Safety procedures
- Equipment specifications
- Error-code meanings
- Component locations
- Replacement intervals
- Torque values
- Electrical ratings
- Operating limits
- Diagnostic steps
- Manufacturer recommendations

If the required information cannot be found in the provided documentation, explicitly say that the available documentation does not provide enough information.

Never fabricate a citation.

# 2. RETRIEVAL-GROUNDED ANSWERS

Before answering a technical question:

1. Understand exactly what the user is asking.
2. Identify the relevant retrieved document passages.
3. Use information directly supported by those passages.
4. Prefer equipment/model-specific documentation over generic information.
5. Combine multiple sources only when they are consistent.
6. If sources conflict, explicitly mention the conflict.
7. If the retrieved information is insufficient, say so.

Do not assume that information about one equipment model applies to another model.

If the user asks about a specific model, component, error code, or procedure, do not generalize from another model unless the documentation explicitly indicates that it applies.

# 3. CITATIONS

Whenever an answer is based on retrieved documentation, cite the relevant source using the citation format provided by the application.

Place citations immediately after the statement or group of statements they support.

Example:

The interlocking belt should be checked for cracks, wear, deformation, and other abnormalities. Replace the belt if cracks or wear are present. [1]

Citation rules:
- Only use citation numbers that exist in the retrieved context.
- Never invent citation numbers.
- Never invent document names or page numbers.
- Never cite a source that does not support the statement.
- Do not add citations merely for appearance.
- Every citation must correspond to an actual retrieved source.

# 4. EVIDENCE FIRST

Separate documented facts from general technical knowledge.

If the documentation directly answers the question:
Answer directly and cite the source.

If the documentation partially answers the question:
Provide only the supported information and clearly state what is missing.

If the documentation does not answer the question:
Say that the organization's available documentation does not contain enough information.

Do not fill missing information with guesses.

If general technical knowledge is useful, clearly identify it as general guidance and do not present it as manufacturer-specific guidance.

# 5. SAFETY

Safety takes priority over convenience.

For questions involving:
- Electrical systems
- High voltage
- Elevators
- Moving machinery
- Pressurized systems
- Refrigerants
- Fire protection systems
- Gas systems
- Heavy equipment
- Working at height
- Lockout/tagout
- Potentially hazardous maintenance

Do not provide unsafe instructions or encourage bypassing safety mechanisms.

When documentation specifies a safety procedure, preserve its meaning accurately.

If the procedure requires qualified personnel, specialized equipment, isolation, lockout/tagout, or another safety control, mention it when relevant.

Never recommend bypassing:
- Safety interlocks
- Emergency stops
- Protective systems
- Manufacturer safety controls
- Required inspections

If documentation is insufficient for a potentially dangerous procedure, do not improvise.

# 6. TROUBLESHOOTING

For troubleshooting questions, provide a logical structure when supported by the documentation:

### Possible Cause
Identify documented possible causes.

### Checks
List documented checks or diagnostic steps.

### Corrective Action
Provide documented corrective actions.

### Safety
Mention relevant safety requirements.

Do not present speculative causes as confirmed causes.

Use language such as:
- "The manual identifies..."
- "According to the troubleshooting guide..."
- "A possible cause listed in the manual is..."
- "The available documentation does not specify..."

# 7. MAINTENANCE PROCEDURES

When explaining a maintenance procedure:

- Preserve the documented sequence whenever possible.
- Do not arbitrarily reorder safety-critical steps.
- Preserve important measurements, limits, intervals, and conditions.
- Do not omit important safety warnings.
- Mention required tools or conditions when documented.
- Cite the relevant source.

Prefer numbered steps for procedures.

# 8. ERROR CODES

When explaining an error code:

1. Verify that the code exists in the retrieved documentation.
2. Identify the equipment/model if available.
3. Provide the documented meaning.
4. Provide documented causes.
5. Provide documented troubleshooting steps.

If the error code is not found in the available documentation, say:

"The available documentation does not contain information about this error code."

Never guess the meaning of an unknown error code.

# 9. EQUIPMENT AND MODEL IDENTIFICATION

Be careful with equipment names and model numbers.

If the user provides a model number or equipment name, use it exactly as provided.

If multiple similar models exist in the documentation, make clear which model the answer applies to.

If the distinction materially affects the answer, ask the user for the model rather than assuming.

# 10. CONFLICTING DOCUMENTATION

If retrieved documents contain conflicting information:

- Do not hide the conflict.
- Identify the conflicting information.
- Prefer newer or explicitly applicable documentation when this can be established.
- If applicability cannot be determined, tell the user that the documents conflict.
- Recommend verification with the appropriate manufacturer or service authority when necessary.

Never silently merge contradictory instructions.

# 11. CONVERSATION CONTEXT

Use previous messages in the current conversation to understand:

- Equipment being discussed
- Model numbers
- Symptoms
- Previous troubleshooting steps
- User-provided observations
- Relevant technical context

However, previous assistant responses are not authoritative technical evidence.

If new documentation contradicts a previous answer, follow the documentation and correct the previous answer.

# 12. RESPONSE STYLE

Be:
- Precise
- Practical
- Professional
- Technically clear
- Concise
- Easy to scan in the field

Prefer:
- Short paragraphs
- Numbered procedures
- Bullet points
- Tables when useful
- Clear safety warnings

Avoid unnecessary conversational filler.

Do not use excessive emojis, jokes, or casual language.

# 13. NO HALLUCINATION

Accuracy is more important than always producing an answer.

If you do not know, say so.

If the documentation does not contain the answer, say so.

If the evidence is ambiguous, say so.

Never manufacture:
- Sources
- Citations
- Page numbers
- Specifications
- Procedures
- Error codes
- Measurements
- Equipment details
- Manufacturer instructions

# 14. ANSWER PRIORITY

Follow this priority when generating an answer:

1. Safety
2. Retrieved organization documentation
3. Equipment/model-specific information
4. Conversation context
5. General technical knowledge when appropriate
6. Never speculate when speculation could create a misleading or unsafe answer

# 15. DEFAULT RESPONSE FORMAT

For a straightforward documentation-based question:

[Direct answer]

[Relevant supporting details]

[Safety note if applicable]

[Citations]

For troubleshooting:

### Possible Cause
...

### Checks
1. ...
2. ...

### Corrective Action
...

### Safety
...

[Citations]

For questions that cannot be answered from the available documentation:

"I couldn't find enough information in the organization's available documentation to answer this reliably."

Then explain what additional information would be required, such as:
- Equipment model
- Error code
- Manual
- Service bulletin
- Specific component
- Observed symptom

# FINAL RULE

Your goal is not to answer every question at any cost.

Your goal is to provide accurate, useful, safe, and traceable maintenance guidance.

When documentation supports the answer, cite it.

When documentation does not support the answer, say so.

Never fabricate information or citations.
`;
export type RetrievedSource = {
  marker: number;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkText: string;
  score: number;
};

@Injectable()
export class ChatService {
  private readonly historyLimit: number;
  private readonly topK: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly openRouter: OpenRouterService,
    private readonly embeddings: EmbeddingsService,
    private readonly qdrant: QdrantService,
    private readonly config: ConfigService,
  ) {
    this.historyLimit = this.config.get<number>('chat.historyLimit') ?? 5;
    this.topK = this.config.get<number>('rag.topK') ?? 5;
  }

  async listSessions(userId: string, organizationId: string) {
    return this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.userId, userId))
      .orderBy(desc(schema.chatSession.updatedAt));
  }

  async getSessionMessages(sessionId: string, userId: string) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    const messages = await this.db
      .select()
      .from(schema.chatMessage)
      .where(eq(schema.chatMessage.sessionId, sessionId))
      .orderBy(asc(schema.chatMessage.createdAt));

    const citationsByMessage = await this.loadCitations(
      messages.map((m) => m.id),
    );

    return {
      session,
      messages: messages.map((m) => ({
        ...m,
        citations: citationsByMessage.get(m.id) ?? [],
      })),
    };
  }

  async createSession(userId: string, organizationId: string, title: string) {
    const id = randomUUID();
    const [session] = await this.db
      .insert(schema.chatSession)
      .values({
        id,
        userId,
        organizationId,
        title,
      })
      .returning();
    return session;
  }

  async updateSession(sessionId: string, userId: string, title: string) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    const [updated] = await this.db
      .update(schema.chatSession)
      .set({ title, updatedAt: new Date() })
      .where(eq(schema.chatSession.id, sessionId))
      .returning();

    return updated;
  }

  async deleteSession(sessionId: string, userId: string) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    await this.db
      .delete(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    return { id: sessionId, deleted: true };
  }

  async addMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
    role: 'user' | 'assistant',
  ) {
    const [session] = await this.db
      .select()
      .from(schema.chatSession)
      .where(eq(schema.chatSession.id, sessionId));

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    const [message] = await this.db
      .insert(schema.chatMessage)
      .values({
        id: randomUUID(),
        sessionId,
        userId,
        organizationId,
        content,
        role,
      })
      .returning();

    await this.db
      .update(schema.chatSession)
      .set({ updatedAt: new Date() })
      .where(eq(schema.chatSession.id, sessionId));

    return message;
  }

  async sendMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
  ) {
    const userMessage = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      content.trim(),
      'user',
    );

    const { llmMessages, sources } = await this.buildPrompt(
      sessionId,
      organizationId,
      content.trim(),
    );

    const assistantContent = await this.openRouter.chat(llmMessages);

    const assistantMessage = await this.saveAssistantMessage(
      sessionId,
      userId,
      organizationId,
      assistantContent,
      sources,
    );

    return { userMessage, assistantMessage };
  }

  /**
   * Persist the user message, run retrieval, and open a streaming completion.
   * Throws (before any streaming begins) if the session is invalid or the LLM
   * request fails, so the controller can return a normal error response.
   */
  async startStreaming(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
  ) {
    const userMessage = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      content.trim(),
      'user',
    );

    const { llmMessages, sources } = await this.buildPrompt(
      sessionId,
      organizationId,
      content.trim(),
    );

    const stream = await this.openRouter.createChatStream(llmMessages);

    return { userMessage, stream, sources };
  }

  async saveAssistantMessage(
    sessionId: string,
    userId: string,
    organizationId: string,
    content: string,
    sources: RetrievedSource[] = [],
  ) {
    const message = await this.addMessage(
      sessionId,
      userId,
      organizationId,
      content,
      'assistant',
    );

    const citations = await this.persistCitations(
      message.id,
      organizationId,
      sources,
    );

    return { ...message, citations };
  }

  /**
   * Build the LLM message array: system prompt + retrieved context + the last
   * CHAT_HISTORY_LIMIT turns. Retrieval failures degrade gracefully to a
   * context-free prompt so chat keeps working when the vector store is down.
   */
  private async buildPrompt(
    sessionId: string,
    organizationId: string,
    query: string,
  ): Promise<{ llmMessages: LlmMessage[]; sources: RetrievedSource[] }> {
    const sources = await this.retrieve(organizationId, query);

    const history = await this.db
      .select({
        role: schema.chatMessage.role,
        content: schema.chatMessage.content,
      })
      .from(schema.chatMessage)
      .where(eq(schema.chatMessage.sessionId, sessionId))
      .orderBy(desc(schema.chatMessage.createdAt))
      .limit(this.historyLimit);

    const recentHistory = history
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemContent =
      sources.length > 0
        ? `${BASE_SYSTEM_PROMPT}\n\n${this.buildContextBlock(sources)}`
        : `${BASE_SYSTEM_PROMPT}\n\nNo relevant passages were found in the uploaded documents for this question. Answer from general knowledge and make clear the answer is not grounded in the organization's documents. Do not invent citations.`;

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: systemContent },
      ...recentHistory,
    ];

    return { llmMessages, sources };
  }

  private async retrieve(
    organizationId: string,
    query: string,
  ): Promise<RetrievedSource[]> {
    try {
      const vector = await this.embeddings.embedOne(query, 'query');
      const hits = await this.qdrant.search(organizationId, vector, this.topK);
      return hits.map((hit, i) => ({
        marker: i + 1,
        documentId: hit.payload.documentId,
        documentName: hit.payload.documentName,
        pageNumber: hit.payload.pageNumber,
        chunkText: hit.payload.chunkText,
        score: hit.score,
      }));
    } catch {
      // Retrieval is best-effort; never block chat on vector store issues.
      return [];
    }
  }

  private buildContextBlock(sources: RetrievedSource[]): string {
    const lines = sources.map(
      (s) =>
        `[${s.marker}] "${s.documentName}" (page ${s.pageNumber}): ${s.chunkText}`,
    );

    return [
      "Use the following sources retrieved from the organization's documents to answer the question.",
      'Cite them inline using [n] markers that match the source numbers below.',
      'Every statement grounded in these sources MUST carry a citation. If a claim is supported by multiple sources, cite all of them (for example [1][3]).',
      'Only cite sources that genuinely support the statement, and do not fabricate citations.',
      '',
      'Sources:',
      ...lines,
    ].join('\n');
  }

  private async persistCitations(
    messageId: string,
    organizationId: string,
    sources: RetrievedSource[],
  ) {
    if (sources.length === 0) return [];

    const rows = sources.map((s) => ({
      id: randomUUID(),
      messageId,
      organizationId,
      documentId: s.documentId,
      documentName: s.documentName,
      pageNumber: s.pageNumber,
      chunkText: s.chunkText,
      score: s.score,
      marker: s.marker,
    }));

    await this.db.insert(schema.citation).values(rows);
    return rows;
  }

  private async loadCitations(messageIds: string[]) {
    const map = new Map<string, (typeof schema.citation.$inferSelect)[]>();
    if (messageIds.length === 0) return map;

    const rows = await this.db
      .select()
      .from(schema.citation)
      .where(inArray(schema.citation.messageId, messageIds))
      .orderBy(asc(schema.citation.marker));

    for (const row of rows) {
      const list = map.get(row.messageId) ?? [];
      list.push(row);
      map.set(row.messageId, list);
    }

    return map;
  }
}

import OpenAI from 'openai';
import pdf from 'pdf-parse';

export interface OpenAIConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
}

export interface Chunk {
    id: string;
    content: string;
    metadata: {
        topic: string;
        summary: string;
        propositions: string[];
    };
}

export interface ChunkResult {
    chunks: Chunk[];
    totalChunks: number;
}

// Agentic Chunking: Uses LLM to identify semantic propositions and group them
async function extractPropositions(client: OpenAI, text: string, model: string): Promise<string[]> {
    const prompt = `Extract atomic propositions from this text. Each proposition should be a single, self-contained fact or idea.

Text:
"""
${text}
"""

Return a JSON array of proposition strings: ["proposition1", "proposition2", ...]`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return [];
        
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.propositions) ? parsed.propositions : [];
    } catch (error) {
        console.error('Proposition extraction failed:', error);
        return [];
    }
}

async function groupPropositions(
    client: OpenAI, 
    propositions: string[], 
    model: string
): Promise<Array<{ topic: string; summary: string; propositions: string[] }>> {
    const prompt = `Group these propositions into semantically coherent chunks. Each chunk should:
- Contain related propositions about the same topic
- Have 3-8 propositions (ideal for embeddings)
- Be self-contained and meaningful

Propositions:
${propositions.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Return JSON array:
[{
  "topic": "Brief topic title",
  "summary": "One sentence summary",
  "propositions": ["prop1", "prop2", ...]
}]`;

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return [];
        
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.chunks) ? parsed.chunks : [];
    } catch (error) {
        console.error('Proposition grouping failed:', error);
        return [];
    }
}

// Fallback: Simple sliding window chunking
function slidingWindowChunk(text: string, windowSize: number = 2000): Chunk[] {
    const chunks: Chunk[] = [];
    let start = 0;
    let chunkIndex = 1;

    while (start < text.length) {
        let end = Math.min(start + windowSize, text.length);
        
       if (end < text.length) {
            const periodIndex = text.lastIndexOf('. ', end);
            const newlineIndex = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(periodIndex, newlineIndex);
            
            if (breakPoint > start) {
                end = breakPoint + 1;
            }
        }

        const content = text.slice(start, end).trim();
        
        if (content.length > 50) {
            chunks.push({
                id: `chunk_${chunkIndex++}`,
                content,
                metadata: {
                    topic: 'Fallback Chunk',
                    summary: content.slice(0, 100) + '...',
                    propositions: []
                }
            });
        }
        
        start = end;
    }

    return chunks;
}

export async function chunkDocumentWithAgentic(
    document: string,
    config: OpenAIConfig
): Promise<ChunkResult> {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
    });

    console.log(`Starting agentic chunking: ${document.length} chars`);

    try {
        const propositions = await extractPropositions(client, document, config.model);
        
        if (propositions.length === 0) {
            console.warn('No propositions extracted, using fallback chunking');
            const chunks = slidingWindowChunk(document);
            return { chunks, totalChunks: chunks.length };
        }

        console.log(`Extracted ${propositions.length} propositions`);

        const groupedChunks = await groupPropositions(client, propositions, config.model);
        
        if (groupedChunks.length === 0) {
            console.warn('Grouping failed, using fallback chunking');
            const chunks = slidingWindowChunk(document);
            return { chunks, totalChunks: chunks.length };
        }

        console.log(`Grouped into ${groupedChunks.length} semantic chunks`);

        const chunks: Chunk[] = groupedChunks.map((group, idx) => ({
            id: `chunk_${idx + 1}`,
            content: group.propositions.join(' '),
            metadata: {
                topic: group.topic,
                summary: group.summary,
                propositions: group.propositions
            }
        }));

        return { chunks, totalChunks: chunks.length };

    } catch (error) {
        console.error('Agentic chunking failed, using fallback:', error);
        const chunks = slidingWindowChunk(document);
        return { chunks, totalChunks: chunks.length };
    }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk as Buffer));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function processPdfStream(stream: NodeJS.ReadableStream): Promise<string> {
    try {
        const buffer = await streamToBuffer(stream);
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error("PDF processing failed:", error);
        throw new Error("PDF processing failed");
    }
}
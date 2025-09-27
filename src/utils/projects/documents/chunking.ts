import OpenAI from 'openai';
import { initializeClient } from '@/config/openrouterConfig';
import * as dotenv from "dotenv"
import pdf from 'pdf-parse';

dotenv.config();

interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  models: {
    primary: string;
    fallback: string;
    metadata: string;
    validation: string;
  };
  costOptimization: {
    maxRetries: number;
    useSmartRouting: boolean;
    budgetLimit?: number;
  };
}

interface ModelCapability {
  name: string;
  costPerToken: number;
  contextLength: number;
  reasoning: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
  reliability: number;
}

interface ChunkBoundary {
  position: number;
  reason: string;
  confidence: number;
}

interface Chunk {
  id: string;
  content: string;
  startPosition: number;
  endPosition: number;
  metadata: {
    topic?: string;
    summary?: string;
    keywords?: string[];
    tokens: number;
    overlapsWithNext: boolean;
  };
}

interface ChunkingStrategy {
  name: string;
  primaryModel: string;
  fallbackModel: string;
  metadataModel: string;
  validationModel: string | null;
  useValidation: boolean;
  maxCostPerChunk: number;
}

interface ChunkResult {
  chunks: Chunk[];
  strategy: string;
  totalCost: number;
  modelsUsed: string[];
}

const RECOMMENDED_MODELS: Record<string, ModelCapability[]> = {
  chunking: [
    {
      name: 'anthropic/claude-3.5-sonnet',
      costPerToken: 0.000003,
      contextLength: 200000,
      reasoning: 'high',
      speed: 'medium',
      reliability: 0.95
    },
    {
      name: 'openai/gpt-4-turbo',
      costPerToken: 0.00001,
      contextLength: 128000,
      reasoning: 'high',
      speed: 'medium',
      reliability: 0.93
    },
    {
      name: 'google/gemini-pro-1.5',
      costPerToken: 0.0000035,
      contextLength: 1000000,
      reasoning: 'high',
      speed: 'fast',
      reliability: 0.91
    }
  ],
  metadata: [
    {
      name: 'openai/gpt-3.5-turbo',
      costPerToken: 0.0000015,
      contextLength: 16000,
      reasoning: 'medium',
      speed: 'fast',
      reliability: 0.88
    },
    {
      name: 'anthropic/claude-3-haiku',
      costPerToken: 0.00000025,
      contextLength: 200000,
      reasoning: 'medium',
      speed: 'fast',
      reliability: 0.90
    }
  ]
};

const usage: Record<string, { inputTokens: number; outputTokens: number; cost: number }> = {};



function determineStrategy(document: string, options: any): ChunkingStrategy {
  const docLength = document.length;
  const complexity = estimateComplexity(document);
  
  if (options.quality === 'high' || complexity > 0.8) {
    return {
      name: 'high-quality',
      primaryModel: 'anthropic/claude-3.5-sonnet',
      fallbackModel: 'openai/gpt-4-turbo',
      metadataModel: 'anthropic/claude-3-haiku',
      validationModel: 'openai/gpt-4',
      useValidation: true,
      maxCostPerChunk: 0.05
    };
  }
  
  if (options.quality === 'fast' || options.maxCost && options.maxCost < 0.1) {
    return {
      name: 'fast-economical',
      primaryModel: 'openai/gpt-3.5-turbo',
      fallbackModel: 'anthropic/claude-3-haiku',
      metadataModel: 'openai/gpt-3.5-turbo',
      validationModel: null,
      useValidation: false,
      maxCostPerChunk: 0.01
    };
  }

  return {
    name: 'balanced',
    primaryModel: 'google/gemini-pro-1.5',
    fallbackModel: 'openai/gpt-3.5-turbo',
    metadataModel: 'anthropic/claude-3-haiku',
    validationModel: docLength > 50000 ? 'openai/gpt-4' : null,
    useValidation: docLength > 50000,
    maxCostPerChunk: 0.02
  };
}

function estimateComplexity(document: string): number {
  const technicalTerms = (document.match(/\b[A-Z]{2,}\b/g) || []).length;
  const avgSentenceLength = document.length / (document.split('.').length || 1);
  const uniqueWords = new Set(document.toLowerCase().split(/\W+/)).size;
  
  return Math.min(1, (technicalTerms * 0.01 + avgSentenceLength * 0.001 + uniqueWords * 0.0001));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function recordUsage(model: string, inputLength: number, outputLength: number) {
  const modelInfo = getModelInfo(model);
  const inputTokens = Math.ceil(inputLength / 4);
  const outputTokens = Math.ceil(outputLength / 4);
  const cost = (inputTokens + outputTokens) * modelInfo.costPerToken;
  
  if (!usage[model]) {
    usage[model] = { inputTokens: 0, outputTokens: 0, cost: 0 };
  }
  
  usage[model].inputTokens += inputTokens;
  usage[model].outputTokens += outputTokens;
  usage[model].cost += cost;
}

function getTotalCost(): number {
  return Object.values(usage).reduce((sum, usage) => sum + usage.cost, 0);
}

function getModelsUsed(): string[] {
  return Object.keys(usage);
}

function getModelInfo(model: string): ModelCapability {
  for (const category of Object.values(RECOMMENDED_MODELS)) {
    const found = category.find(m => m.name === model);
    if (found) return found;
  }
  
  return {
    name: model,
    costPerToken: 0.000001,
    contextLength: 4000,
    reasoning: 'medium',
    speed: 'medium',
    reliability: 0.8
  };
}

async function callModel(client: OpenAI, modelName: string, prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No response from model ${modelName}`);
  }

  return content;
}

function buildChunkingPrompt(document: string): string {
  return `Analyze this document and identify optimal chunk boundaries for knowledge retrieval.

Requirements:
- Chunks should be 200-1000 tokens each
- Split at natural topic boundaries
- Maintain semantic coherence
- Consider headings, paragraphs, and topic shifts

Document:
"""
${document}
"""

Return JSON array of boundaries:
[{"position": <char_pos>, "reason": "<explanation>", "confidence": <0-1>}]`;
}

function parseChunkBoundaries(response: string): ChunkBoundary[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found');
  } catch (error) {
    console.error('Failed to parse boundaries:', error);
    return [];
  }
}

function ruleBasedChunking(document: string): ChunkBoundary[] {
  const boundaries: ChunkBoundary[] = [];
  const paragraphs = document.split(/\n\s*\n/);
  let position = 0;
  
  for (let i = 0; i < paragraphs.length - 1; i++) {
    position += paragraphs[i].length + 2;
    if (position > 500) {
      boundaries.push({
        position,
        reason: 'rule_based_paragraph',
        confidence: 0.6
      });
    }
  }
  
  return boundaries;
}

async function identifyBoundariesWithFallback(
  client: OpenAI,
  document: string,
  primaryModel: string,
  fallbackModel: string
): Promise<ChunkBoundary[]> {
  const prompt = buildChunkingPrompt(document);
  
  try {
    const result = await callModel(client, primaryModel, prompt);
    recordUsage(primaryModel, prompt.length, result.length);
    return parseChunkBoundaries(result);
  } catch (error) {
    console.warn(`Primary model ${primaryModel} failed, trying fallback ${fallbackModel}`);
    
    try {
      const result = await callModel(client, fallbackModel, prompt);
      recordUsage(fallbackModel, prompt.length, result.length);
      return parseChunkBoundaries(result);
    } catch (fallbackError) {
      console.error('Both models failed, using rule-based fallback');
      return ruleBasedChunking(document);
    }
  }
}

async function validateBoundaries(
  client: OpenAI,
  document: string,
  boundaries: ChunkBoundary[],
  validationModel: string
): Promise<ChunkBoundary[]> {
  const validationPrompt = `Review these chunk boundaries for a document and suggest improvements:

Document length: ${document.length} characters
Proposed boundaries: ${JSON.stringify(boundaries)}

Evaluate:
1. Semantic coherence of resulting chunks
2. Natural breaking points
3. Size balance

Return either "APPROVED" or improved boundaries in same JSON format.`;

  try {
    const result = await callModel(client, validationModel, validationPrompt);
    recordUsage(validationModel, validationPrompt.length, result.length);
    
    if (result.includes('APPROVED')) {
      return boundaries;
    }
    
    return parseChunkBoundaries(result);
  } catch (error) {
    console.warn('Validation failed, using original boundaries');
    return boundaries;
  }
}

async function batchEnrichMetadata(
  client: OpenAI,
  contents: string[],
  model: string
): Promise<any[]> {
  const batchPrompt = `Analyze these text chunks and provide metadata for each:

${contents.map((content, i) => `
Chunk ${i + 1}:
"""
${content.substring(0, 300)}...
"""
`).join('\n')}

Return JSON array with format:
[
  {"topic": "...", "summary": "...", "keywords": ["..."]},
  ...
]`;

  try {
    const result = await callModel(client, model, batchPrompt);
    recordUsage(model, batchPrompt.length, result.length);
    return JSON.parse(result);
  } catch (error) {
    console.warn('Batch metadata enrichment failed');
    return contents.map(() => ({ topic: 'unknown', summary: '', keywords: [] }));
  }
}

async function createOptimizedChunks(
  client: OpenAI,
  document: string,
  boundaries: ChunkBoundary[],
  metadataModel: string
): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  let startPos = 0;

  for (let i = 0; i < boundaries.length; i++) {
    const endPos = boundaries[i].position;
    const content = document.slice(startPos, endPos).trim();

    if (content.length > 100) {
      const chunk: Chunk = {
        id: `chunk_${i + 1}`,
        content,
        startPosition: startPos,
        endPosition: endPos,
        metadata: {
          tokens: estimateTokens(content),
          overlapsWithNext: i < boundaries.length - 1,
        }
      };

      if (i % 3 === 0) {
        const batchChunks = [chunk];
        const enrichedMetadata = await batchEnrichMetadata(
          client,
          batchChunks.map(c => c.content),
          metadataModel
        );
        chunk.metadata = { ...chunk.metadata, ...enrichedMetadata[0] };
      }

      chunks.push(chunk);
    }
    startPos = endPos;
  }

  return chunks;
}

export async function chunkDocumentWithOpenRouter(
  document: string,
  config: OpenRouterConfig,
  options: {
    quality?: 'high' | 'balanced' | 'fast';
    maxCost?: number;
    preferredProvider?: string;
  } = {}
): Promise<ChunkResult> {
  const client = initializeClient(config);
  const strategy = determineStrategy(document, options);
  
  try {
    const boundaries = await identifyBoundariesWithFallback(
      client,
      document, 
      strategy.primaryModel,
      strategy.fallbackModel
    );

    const validatedBoundaries = strategy.useValidation 
      ? await validateBoundaries(client, document, boundaries, strategy.validationModel!)
      : boundaries;

    const chunks = await createOptimizedChunks(
      client,
      document, 
      validatedBoundaries, 
      strategy.metadataModel
    );

    return {
      chunks,
      strategy: strategy.name,
      totalCost: getTotalCost(),
      modelsUsed: getModelsUsed()
    };

  } catch (error) {
    console.error('Chunking failed:', error);
    throw new Error(`OpenRouter chunking failed: ${error}`);
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk as Buffer));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function processPdfStream(minioDataStream: NodeJS.ReadableStream):Promise<string>{
    try {
        
        const dataBuffer = await streamToBuffer(minioDataStream);

        
        const data = await pdf(dataBuffer);

        const extractedText = data.text;

        return extractedText;

    } catch (error) {
        console.error("Failed to process PDF stream:", error);
        throw new Error("PDF processing failed.");
    }
}

  
  
  
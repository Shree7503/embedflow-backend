import { Worker, Job } from 'bullmq';
import { redisConfig, bullMqConnection } from '@/config/redisConfig';
import logger from '@/utils/debug/logger';
import { chunkDocumentWithOpenRouter } from '@/utils/projects/documents/chunking'
import { processPdfStream } from '@/utils/projects/documents/chunking'

import {
  initializePipeline,
  startPipeline,
  stopPipeline,
  disconnectPipeline
} from '@/services/minio-bullmq-pipeline.service';
import { getObject, getObjectStream } from "@/utils/projects/documents/minio";
import { info, log } from 'node:console';

interface MinioEventPayload {
  eventName: string;
  bucketName: string;
  objectKey: string;
  objectSize?: number;
  contentType?: string;
  eventTime: string;
  userMetadata?: Record<string, any>;
  originalEvent?: any;
}

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

const PIPELINE_CONFIG = {
  minioListName: process.env.MINIO_EVENTS_LIST || 'minio-events',
  queueName: process.env.BULLMQ_QUEUE_NAME || 'file-processing',
  redisConfig: redisConfig
};

const config:OpenRouterConfig ={
        apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPEN_ROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    models: {
      primary: 'anthropic/claude-3.5-sonnet',
      fallback: 'openai/gpt-3.5-turbo',
      metadata: 'anthropic/claude-3-haiku',
      validation: 'openai/gpt-4'
    },
    costOptimization: {
      maxRetries: 2,
      useSmartRouting: true,
      budgetLimit: 1.0
    }
    }


const QUEUE_NAME = PIPELINE_CONFIG.queueName;

let worker: Worker<MinioEventPayload> | null = null;
let isPipelineRunning = false;

async function processMinioEvent(job: Job<MinioEventPayload>): Promise<{ status: string; processedObject: string }> {

  const payload = job.data;
  const { eventName, bucketName, objectKey} = payload;
  try {
    const objectName = objectKey;

    let finalDoc
    
    if(payload.contentType=="application/json" || payload.contentType=="text/plain" || payload.contentType=="text/csv"){
      const fetchedObject = await getObject(bucketName, objectName);
      const document = fetchedObject.toString("utf-8")  
      finalDoc = document
     }else{
      const fetchedObjectstream = await getObjectStream(bucketName, objectName);
      const document2 = await processPdfStream(fetchedObjectstream);
      finalDoc = document2
    }

    if(finalDoc){
      const result = await chunkDocumentWithOpenRouter(finalDoc,config,{
      quality: 'balanced',
      maxCost: 0.50,
      preferredProvider: 'anthropic'
      })
    }

    
    


    
    logger.info(`✅ Successfully processed MinIO event for object: ${objectKey}`);
    return { status: 'success', processedObject: objectKey };

  } catch (error) {
    logger.error(`❌ Failed to process MinIO event:`, {
      error: error instanceof Error ? error.message : error,
      jobId: job.id,
      objectKey,
      eventName
    });
    throw error;
  }
}

function createWorker(): Worker<MinioEventPayload> {
  const worker = new Worker<MinioEventPayload>(
    QUEUE_NAME,
    processMinioEvent,
    {
      connection: bullMqConnection,
      concurrency: 5,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  worker.on('completed', (job: Job) => {
    logger.info(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`❌ Job ${job?.id} failed:`, {
      jobId: job?.id,
      error: err.message,
      stack: err.stack
    });
  });

  worker.on('error', (err: Error) => {
    logger.error('Worker error:', {
      error: err.message,
      stack: err.stack
    });
  });

  worker.on('stalled', (jobId: string) => {
    logger.warn(`⏳ Job ${jobId} stalled and will be retried`);
  });

  return worker;
}

async function startPipelineWorker(): Promise<void> {
  if (isPipelineRunning) {
    logger.warn('Pipeline worker is already running');
    return;
  }

  try {
    logger.info('Starting pipeline worker...', PIPELINE_CONFIG);
    await initializePipeline(PIPELINE_CONFIG);
    startPipeline(PIPELINE_CONFIG.minioListName).catch((error) => {
      logger.error('Pipeline failed:', error);
    });
    isPipelineRunning = true;
    logger.info('Pipeline worker started successfully');
  } catch (error) {
    logger.error('Pipeline worker failed to start:', error);
    throw error;
  }
}

async function stopPipelineWorker(): Promise<void> {
  try {
    logger.info('Stopping pipeline worker...');
    if (isPipelineRunning) {
      stopPipeline();
      await disconnectPipeline();
      isPipelineRunning = false;
    }
    logger.info('Pipeline worker stopped successfully');
  } catch (error) {
    logger.error('Error stopping pipeline worker:', error);
    throw error;
  }
}

async function startJobProcessor(): Promise<void> {
  try {
    logger.info('Starting BullMQ job processor...');
    worker = createWorker();
    logger.info(`🚀 BullMQ worker is running and listening for jobs in queue: '${QUEUE_NAME}'`);
  } catch (error) {
    logger.error('Failed to start job processor:', error);
    throw error;
  }
}

async function stopJobProcessor(): Promise<void> {
  try {
    if (worker) {
      logger.info('Stopping BullMQ job processor...');
      await worker.close();
      worker = null;
      logger.info('BullMQ job processor stopped');
    }
  } catch (error) {
    logger.error('Error stopping job processor:', error);
    throw error;
  }
}

async function startWorker(): Promise<void> {
  try {
    logger.info('🚀 Starting MinIO-BullMQ bridge worker...');
    logger.info('📡 Starting pipeline to bridge MinIO list → BullMQ queue...');
    await startPipelineWorker();
    logger.info('⚙️ Starting BullMQ job processor...');
    await startJobProcessor();
    logger.info('✅ MinIO-BullMQ bridge worker started successfully');
    logger.info(`📋 Pipeline: ${PIPELINE_CONFIG.minioListName} → ${QUEUE_NAME}`);
  } catch (error) {
    logger.error('❌ Failed to start bridge worker:', error);
    process.exit(1);
  }
}

async function stopWorker(): Promise<void> {
  try {
    logger.info('🛑 Stopping MinIO-BullMQ bridge worker...');
    await stopJobProcessor();
    await stopPipelineWorker();
    logger.info('✅ Bridge worker stopped successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error stopping bridge worker:', error);
    process.exit(1);
  }
}

function setupGracefulShutdown(): void {
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await stopWorker();
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await stopWorker();
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    stopWorker();
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    stopWorker();
  });
}

if (require.main === module) {
  setupGracefulShutdown();
  startWorker();
}

export {
  startWorker,
  stopWorker,
  startPipelineWorker,
  stopPipelineWorker,
  startJobProcessor,
  stopJobProcessor
};
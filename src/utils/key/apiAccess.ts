import prisma from "@/database/prisma";


export async function getApiKeyByObjectKey(objectKey: string): Promise<string> {
  const parts = objectKey.split('/');

  if (parts.length !== 3) {
    throw new Error(`Invalid objectKey format: ${objectKey}`);
  }

  const [userId, projectId] = parts;

  try {
    const apiKeyRecord = await prisma.apiKey.findFirstOrThrow({
      where: {
        userId: userId,
        projectId: projectId,
        isActive: true,
      },
      select: {
        keyPrefix: true,
        keyHash: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return apiKeyRecord.keyPrefix + apiKeyRecord.keyHash;

  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2025') {
      throw new Error(`No active API key found for User ID: ${userId} and Project ID: ${projectId}`);
    }
    
    if (error instanceof Error) {
      console.error("Prisma query failed:", error.message);
    } 
    
    throw new Error(`Failed to retrieve API key for resource: ${objectKey}`);
  }
}
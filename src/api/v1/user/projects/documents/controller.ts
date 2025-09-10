import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import { generatePreSignedUrl } from "@/utils/projects/documents/presignedUrl.utils";


const getFileTypeEnum = (mimetype: string): 'PDF' | 'TXT' | 'DOCX' | 'MD' | 'CSV' => {
  switch (mimetype) {
    case 'application/pdf':
      return 'PDF';
    case 'text/plain':
      return 'TXT';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX';
    case 'text/markdown':
      return 'MD';
    case 'text/csv':
      return 'CSV';
    default:
      // Fallback or throw an error for unsupported types
      throw new Error('Unsupported file type');
  }
};

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
try {
     const {
    filename,
    bucketName,
    mimetype
  } = req.body;
    
    const userId = req.user!.id; 
    const projectId = req.params.projectId;
    const expTime = 5*60;
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or you do not have permission to access it.' });
    }
    if (!req.body) {
      return res.status(400).json({ message: 'No file name provided. Please include a file in your request.' });
    }
    const newDocument = await prisma.document.create({
      data: {
        projectId: projectId,
        fileName: filename,
        fileType: getFileTypeEnum(mimetype),
        storagePath: bucketName, 
        ingestionStatus: 'PENDING', 
      },
    });
    
    const objectName = `${newDocument.id}-${filename}`
    const presignedUrl =await generatePreSignedUrl(objectName,newDocument.storagePath,expTime);
    
    
    res.status(201).json({
      message: 'Successfully generated presigned URL',
      presignedUrl:presignedUrl
    });

    
  } catch (error) {
    res.status(500).json({
            message: 'An error occurred on the server while generating the upload URL.',
            error: (error as Error).message
        });
    next(error);
  }
};

export const getDocument= async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try{
    const projectId = req.params.projectId;

  const newDocument = await prisma.document.findMany({
    where:{
      projectId:projectId,
    }
  })
  res.status(201).send(newDocument) 
  }catch(error){
    res.status(500).json({
            message: 'error while fetching documents',
            error: (error as Error).message
        });
    next(error)
  }
  
};

export const changeDocument= async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
};

export const delDocument= async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
};

export const getDocumentById= async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
};
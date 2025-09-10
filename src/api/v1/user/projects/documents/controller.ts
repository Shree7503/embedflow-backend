import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import { generatePreSignedUrl,deleteObject } from "@/utils/projects/documents/minio";


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
      throw new Error(`Unsupported file type: ${mimetype}`);
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

   if (!filename || !bucketName || !mimetype) {
     return res.status(400).json({ message: 'Request must include filename, bucketName, and mimetype.' });
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
   
   
   return res.status(201).json({
     message: 'Successfully generated presigned URL',
     presignedUrl:presignedUrl
   });

   
  } catch (error) {
    next(error);
  }
};


export const getDocument= async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try{
    const userId = req.user!.id;
    const projectId = req.params.projectId;

    const documents = await prisma.document.findMany({
      where:{
        projectId: projectId,
        project: {
          userId: userId,
        }
      }
    })

    
    return res.status(200).json(documents);

  }catch(error){
    next(error);
  }
};


export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        projectId: projectId,
        project: {
          userId: userId,
        },
      },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found or you do not have permission to access it.' });
    }

    return res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};



export const changeDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;
    const { fileName } = req.body; 

    if (!fileName) {
      return res.status(400).json({ message: 'Request body must include the new fileName.' });
    }

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: {
          id: documentId,
          projectId: projectId,
          project: {
            userId: userId,
          },
        },
      });

      if (!document) {
        return null;
      }
      
      return tx.document.update({
        where: { id: documentId },
        data: { fileName },
      });
    });

    if (!updatedDocument) {
      return res.status(404).json({ message: 'Document not found or you do not have permission to modify it.' });
    }

    return res.status(200).json(updatedDocument);

  } catch (error) {
    next(error);
  }
};


export const delDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        projectId: projectId,
        project: {
          userId: userId,
        },
      },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found or you do not have permission to delete it.' });
    }

    const objectName = `${document.id}-${document.fileName}`;
    const bucketName = document.storagePath;

    await deleteObject(bucketName, objectName);

    await prisma.document.delete({
      where: { id: documentId },
    });

    return res.status(204).send();

  } catch (error) {
    next(error);
  }
};

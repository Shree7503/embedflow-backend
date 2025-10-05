import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey.service'; // Path to the service file
import { AppError } from '../utils/debug/AppError'; // Path to AppError
import { errorHandler } from '../handlers/error.handler'; // Assuming you have a central error handler


export const apiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorHandler(new AppError('Authorization header missing or malformed. Expected format: Bearer <API_KEY>'), req, res, next);
  }

  const fullApiKey = authHeader.split(' ')[1];

  try {
    const authContext = await apiKeyService.validateAndGetProject(fullApiKey);

    req.project = authContext.project; 

   
    next();
  } catch (error) {
   
    return errorHandler(error, req, res, next);
  }
};
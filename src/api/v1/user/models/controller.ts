import { NextFunction, Request, Response } from "express";
import prisma from "@/database/prisma";

type ModelType = "RETRIEVAL" | "GENERATOR";

type ModelUpdate = {
  modelName?: string;
  modelType?: ModelType;
  description?: string;
  isActive?: boolean;
};

export const createModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { modelName, modelType, description } = req.body;

  try {
    const model = await prisma.model.create({
      data: {
        modelName: modelName,
        modelType: modelType,
        description: description,
      },
    });

    res.status(201).json({
      success: true,
      message: "Project created",
      data: model,
    });
  } catch (error) {
    next(error);
  }
};

export const getModels = async (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const model = await prisma.model.findMany();

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "No model found",
      });
    }

    res.status(201).json({
      success: true,
      data: model,
    });
  } catch (error) {
    next(error);
  }
};

export const updateModel = async (
  req: Request<{ id: string }, object, ModelUpdate>,
  res: Response,
  next: NextFunction
) => {
  const updates = req.body;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Model ID is required",
    });
  }

  try {
    await prisma.model.update({
      where: {
        id: id as string,
      },
      data: updates,
    });

    res.status(200).json({
      success: true,
      message: "Model updated successfully",
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Model ID is required",
    });
  }

  try {
    await prisma.model.delete({
      where: {
        id: id as string,
      },
    });

    res.status(200).json({
      success: true,
      message: "Model deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";

type ProjectUpdate = {
  name?: string;
  description?: string;
  retrievalModelId?: number;
  generatorModelId?: number;
  vectorDbCollectionName?: string;
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    name,
    description,
    retrievalModelId,
    generatorModelId,
    vectorDbCollectionName,
  } = req.body;

  try {
    const project = await prisma.project.create({
      data: {
        userId: req.user!.id,
        name: name,
        description: description,
        retrievalModelId: retrievalModelId,
        generatorModelId: generatorModelId,
        vectorDbCollectionName: vectorDbCollectionName,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Project created",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = await prisma.project.findMany({
      where: {
        userId: req.user!.id,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request<{ id: string }, object, ProjectUpdate>,
  res: Response,
  next: NextFunction
) => {
  const id = req.user!.id;
  const updates = req.body;

  try {
    const project = await prisma.project.update({
      where: {
        id: id,
      },
      data: updates,
    });

    res.status(200).json({
      status: "success",
      message: "Project updated",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  const id = req.params.id;

  try {
    await prisma.project.delete({
      where: {
        id: id,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Project deleted",
    });
  } catch (error) {
    next(error);
  }
};

import express from "express";
import {uploadDocument,getDocument,delDocument,changeDocument,getDocumentById} from "@/api/v1/user/projects/documents/controller";


const router = express.Router({mergeParams:true});

router.post("/",uploadDocument);
router.get("/",getDocument);
router.put("/",changeDocument);
router.delete("/:documentId",delDocument);
router.get("/:documentId",getDocumentById);


export default router;
import minioClient from "@/config/minIOConfig";


export const generatePreSignedUrl = async (fileName:string,bucketName:string,expTime:number):Promise<string>=>{
    
    const presignedURL =await minioClient.presignedPutObject(
            bucketName,
            fileName,
            expTime
        );
    return presignedURL;
}


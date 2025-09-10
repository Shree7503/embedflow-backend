import minioClient from "@/config/minIOConfig";


export const generatePreSignedUrl = async (objectName: string, bucketName: string, expTime: number): Promise<string> => {
    try {
        const presignedURL = await minioClient.presignedPutObject(
            bucketName,
            objectName,
            expTime
        );
        return presignedURL;
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw new Error("Could not generate presigned URL.");
    }
};

export const deleteObject = async (bucketName: string, objectName: string): Promise<void> => {
    try {
        await minioClient.removeObject(bucketName, objectName);
        console.log(`Successfully deleted '${objectName}' from bucket '${bucketName}'.`);
    } catch (error) {
        console.error(`Error deleting object '${objectName}' from bucket '${bucketName}':`, error);
        throw new Error("Failed to delete object from storage.");
    }
};

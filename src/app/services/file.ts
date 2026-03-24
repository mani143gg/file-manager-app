import { Injectable } from '@angular/core';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FileService {

  private s3 = new S3Client({
    region: environment.aws.region,
    credentials: {
      accessKeyId: environment.aws.accessKeyId,
      secretAccessKey: environment.aws.secretAccessKey,
    },
    requestHandler: new XhrHttpHandler()
  });

  async uploadToS3(file: File): Promise<string> {
    const key = `uploads/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    await this.s3.send(new PutObjectCommand({
      Bucket: environment.aws.bucketName,
      Key: key,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
      ACL: 'public-read'
    }));

    return `https://${environment.aws.bucketName}.s3.${environment.aws.region}.amazonaws.com/${key}`;
  }

  async listFiles(): Promise<any[]> {
    const response = await this.s3.send(new ListObjectsV2Command({
      Bucket: environment.aws.bucketName,
      Prefix: 'uploads/',
    }));

    return (response.Contents || [])
      .filter(f => f.Key !== 'uploads/')   // remove folder entry
      .map(f => ({
        key: f.Key,
        name: f.Key?.replace('uploads/', ''),
        size: ((f.Size || 0) / 1024).toFixed(1) + ' KB',
        date: new Date(f.LastModified!).toLocaleDateString(),
        url: `https://${environment.aws.bucketName}.s3.${environment.aws.region}.amazonaws.com/${f.Key}`
      }));
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: environment.aws.bucketName,
      Key: key
    }));
  }
}
import { Injectable } from '@angular/core';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  MediaConvertClient,
  CreateJobCommand,
  GetJobCommand,
  JobStatus
} from '@aws-sdk/client-mediaconvert';
import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler';
import { environment } from '../../environments/environment';

export interface VideoJob {
  id: string;
  fileName: string;
  fileSize: string;
  status: 'Queued' | 'Uploading' | 'Submitted' | 'Progressing' | 'Complete' | 'Error';
  mediaConvertJobId?: string;
  outputUrl?: string;
  errorMsg?: string;
  progress?: number;
}

@Injectable({ providedIn: 'root' })
export class VideoService {

  private s3 = new S3Client({
    region: environment.aws.region,
    credentials: {
      accessKeyId: environment.aws.accessKeyId,
      secretAccessKey: environment.aws.secretAccessKey,
    },
    requestHandler: new XhrHttpHandler()
  });

  private sqs = new SQSClient({
    region: environment.aws.region,
    credentials: {
      accessKeyId: environment.aws.accessKeyId,
      secretAccessKey: environment.aws.secretAccessKey,
    }
  });

  // MediaConvert needs a custom endpoint
  private mediaConvert = new MediaConvertClient({
    region: environment.aws.region,
    endpoint: environment.aws.mediaConvertEndpoint,
    credentials: {
      accessKeyId: environment.aws.accessKeyId,
      secretAccessKey: environment.aws.secretAccessKey,
    }
  });

  // Step 1 — Upload raw video to S3 input bucket
  async uploadVideo(file: File, jobId: string): Promise<string> {
    const key = `videos/${jobId}-${file.name}`;
    const buffer = await file.arrayBuffer();

    await this.s3.send(new PutObjectCommand({
      Bucket: environment.aws.inputBucket,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
    }));

    return key;
  }

  // Step 2 — Push job message to SQS
  async sendToQueue(payload: {
    jobId: string;
    inputKey: string;
    fileName: string;
  }): Promise<void> {
    await this.sqs.send(new SendMessageCommand({
      QueueUrl: environment.aws.sqsQueueUrl,
      MessageBody: JSON.stringify(payload),
    }));
  }

  // Step 3 — Create MediaConvert job (720p + 1080p outputs)
  async startMediaConvert(inputKey: string): Promise<string> {
    const inputUri  = `s3://${environment.aws.inputBucket}/${inputKey}`;
    const outputUri = `s3://${environment.aws.outputBucket}/transcoded/`;

    const response = await this.mediaConvert.send(new CreateJobCommand({
      Role: environment.aws.mediaConvertRole,
      Settings: {
        Inputs: [{
          FileInput: inputUri,
          AudioSelectors: {
            'Audio Selector 1': { DefaultSelection: 'DEFAULT' }
          },
          VideoSelector: {},
          TimecodeSource: 'ZEROBASED'
        }],
        OutputGroups: [{
          Name: 'MP4 outputs',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: outputUri
            }
          },
          Outputs: [
            // 1080p output
            {
              NameModifier: '_1080p',
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {}
              },
              VideoDescription: {
                Width: 1920,
                Height: 1080,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    Bitrate: 5000000,
                    RateControlMode: 'CBR',
                    CodecProfile: 'HIGH',
                    CodecLevel: 'AUTO',
                    FramerateControl: 'INITIALIZE_FROM_SOURCE'
                  }
                }
              },
              AudioDescriptions: [{
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 128000,
                    SampleRate: 48000,
                    CodingMode: 'CODING_MODE_2_0'
                  }
                }
              }]
            },
            // 720p output
            {
              NameModifier: '_720p',
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {}
              },
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    Bitrate: 2500000,
                    RateControlMode: 'CBR',
                    CodecProfile: 'MAIN',
                    CodecLevel: 'AUTO',
                    FramerateControl: 'INITIALIZE_FROM_SOURCE'
                  }
                }
              },
              AudioDescriptions: [{
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    SampleRate: 48000,
                    CodingMode: 'CODING_MODE_2_0'
                  }
                }
              }]
            }
          ]
        }]
      }
    }));

    return response.Job?.Id || '';
  }

  // Step 4 — Poll job status
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    outputKey?: string;
  }> {
    const response = await this.mediaConvert.send(
      new GetJobCommand({ Id: jobId })
    );

    const job = response.Job;
    const status = job?.Status || 'UNKNOWN';
    const progress = job?.JobPercentComplete || 0;

    // Build 720p output URL when complete
    let outputKey: string | undefined;
    if (status === JobStatus.COMPLETE) {
      const inputFile = job?.Settings?.Inputs?.[0]?.FileInput || '';
      const baseName = inputFile.split('/').pop()?.replace(/\.[^.]+$/, '') || 'output';
      outputKey = `transcoded/${baseName}_720p.mp4`;
    }

    return { status, progress, outputKey };
  }

  getOutputUrl(outputKey: string): string {
    return `https://${environment.aws.outputBucket}.s3.${environment.aws.region}.amazonaws.com/${outputKey}`;
  }
}
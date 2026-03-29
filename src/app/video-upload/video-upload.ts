import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService, VideoJob } from '../services/video.service';

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width:750px; margin:40px auto; font-family:sans-serif; padding:0 1rem">

      <h2>🎬 Video Transcoding Queue</h2>
      <p style="color:#666; font-size:14px; margin-top:-10px">
        Powered by AWS MediaConvert — outputs 720p + 1080p MP4
      </p>

      <!-- Drop zone -->
      <div style="border:2px dashed #ccc; border-radius:8px;
                  padding:1.5rem; text-align:center; margin-bottom:1rem">
        <input type="file" accept="video/*" multiple
               (change)="onFilesSelect($event)" #videoInput style="display:none"/>
        <button (click)="videoInput.click()"
                style="padding:8px 24px; cursor:pointer; margin-bottom:8px; font-size:15px">
          🎥 Choose Video(s)
        </button>
        <p style="color:#555; font-size:14px; margin:0">
          {{ selectedFiles.length > 0
              ? selectedFiles.length + ' video(s) selected'
              : 'mp4, mov, avi supported — select multiple' }}
        </p>
      </div>

      <!-- Add to queue button -->
      <button
        (click)="queueAll()"
        [disabled]="selectedFiles.length === 0 || processing"
        style="width:100%; padding:12px; font-size:16px; font-weight:500;
               background:#6f42c1; color:white; border:none;
               border-radius:6px; cursor:pointer; margin-bottom:1.5rem">
        {{ processing ? '⏳ Adding to queue...' : '🚀 Add to Queue & Transcode' }}
      </button>

      <!-- Queue table header -->
      <div style="display:flex; justify-content:space-between;
                  align-items:center; margin-bottom:0.5rem">
        <h3 style="margin:0">
          Job Queue
          <span *ngIf="activeJobCount > 0"
                style="font-size:13px; font-weight:400;
                       color:#6f42c1; margin-left:8px">
            ● {{ activeJobCount }} active
          </span>
        </h3>
        <span style="font-size:12px; color:#999">
          {{ pollingActive ? '🔄 Polling every 5s' : '' }}
        </span>
      </div>

      <!-- Empty -->
      <p *ngIf="jobs.length === 0" style="color:#999; font-size:14px">
        No jobs yet. Select a video above.
      </p>

      <!-- Table -->
      <table *ngIf="jobs.length > 0"
             style="width:100%; border-collapse:collapse; font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:left">File</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:left">Size</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:center; width:180px">Status</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:center; width:100px">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let job of jobs; let i = index"
              [style.background]="i % 2 === 0 ? '#fff' : '#fafafa'">

            <!-- File name -->
            <td style="padding:10px 12px; border:1px solid #ddd">
              {{ job.fileName }}
            </td>

            <!-- Size -->
            <td style="padding:10px 12px; border:1px solid #ddd; color:#666">
              {{ job.fileSize }}
            </td>

            <!-- Status + progress bar -->
            <td style="padding:10px 12px; border:1px solid #ddd; text-align:center">
              <span [style.color]="statusColor(job.status)" style="font-weight:500">
                {{ statusIcon(job.status) }} {{ job.status }}
              </span>
              <!-- Progress bar for Progressing -->
              <div *ngIf="job.status === 'Progressing' && job.progress"
                   style="background:#eee; border-radius:4px;
                          overflow:hidden; margin-top:6px; height:6px">
                <div [style.width]="job.progress + '%'"
                     style="background:#6f42c1; height:6px;
                            transition: width 0.5s ease">
                </div>
              </div>
              <span *ngIf="job.status === 'Progressing' && job.progress"
                    style="font-size:12px; color:#999">
                {{ job.progress }}%
              </span>
              <!-- Error message -->
              <p *ngIf="job.errorMsg"
                 style="font-size:11px; color:#dc3545; margin:4px 0 0">
                {{ job.errorMsg }}
              </p>
            </td>

            <!-- Action -->
            <td style="padding:10px 12px; border:1px solid #ddd; text-align:center">
              <span *ngIf="job.status === 'Complete'"
                    (click)="playVideo(job)"
                    style="color:#007bff; cursor:pointer; font-weight:500">
                ▶ Play
              </span>
              <span *ngIf="job.status === 'Error'"
                    (click)="retryJob(job)"
                    style="color:#dc3545; cursor:pointer; font-weight:500">
                ↺ Retry
              </span>
              <span *ngIf="!['Complete','Error'].includes(job.status)"
                    style="color:#ccc">—</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f5f5f5">
            <td colspan="4"
                style="padding:8px 12px; border:1px solid #ddd;
                       font-size:13px; color:#555; text-align:right">
              {{ completedCount }} of {{ jobs.length }} completed
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Video player -->
      <div *ngIf="activeVideoUrl"
           style="margin-top:2rem; border-radius:8px;
                  overflow:hidden; background:#000">
        <div style="display:flex; justify-content:space-between;
                    align-items:center; padding:10px 14px; background:#1a1a1a">
          <span style="color:#fff; font-size:14px">{{ activeVideoName }}</span>
          <span (click)="closePlayer()"
                style="color:#fff; cursor:pointer; font-size:20px; line-height:1">✕</span>
        </div>
        <video [src]="activeVideoUrl" controls autoplay
               style="width:100%; display:block; max-height:420px">
        </video>
        <div style="padding:8px 14px; background:#1a1a1a">
          <a [href]="activeVideoUrl" target="_blank"
             style="color:#6f42c1; font-size:13px; text-decoration:none">
            Download 720p ↗
          </a>
        </div>
      </div>

    </div>
  `
})
export class VideoUploadComponent implements OnDestroy {
  selectedFiles: File[] = [];
  jobs: VideoJob[] = [];
  processing = false;
  activeVideoUrl = '';
  activeVideoName = '';
  pollingActive = false;
  private pollInterval: any;
  private retryFiles = new Map<string, File>();

  constructor(
    private videoService: VideoService,
    private cdr: ChangeDetectorRef
  ) {}

  get completedCount() {
    return this.jobs.filter(j => j.status === 'Complete').length;
  }

  get activeJobCount() {
    return this.jobs.filter(j =>
      ['Uploading', 'Submitted', 'Progressing'].includes(j.status)
    ).length;
  }

  onFilesSelect(event: any) {
    this.selectedFiles = Array.from(event.target.files);
    this.cdr.detectChanges();
  }

  async queueAll() {
    if (!this.selectedFiles.length) return;
    this.processing = true;
    this.cdr.detectChanges();

    for (const file of this.selectedFiles) {
      const job: VideoJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        status: 'Queued',
        progress: 0
      };
      this.jobs = [...this.jobs, job];
      this.retryFiles.set(job.id, file);
      this.cdr.detectChanges();

      // Process without blocking the loop
      this.processJob(job, file);
    }

    this.selectedFiles = [];
    this.processing = false;
    this.cdr.detectChanges();
    this.startPolling();
  }

  private async processJob(job: VideoJob, file: File) {
    try {
      // 1 — Upload to S3
      this.updateJob(job.id, { status: 'Uploading' });

      const inputKey = await this.videoService.uploadVideo(file, job.id);

      // 2 — Send to SQS
      await this.videoService.sendToQueue({
        jobId: job.id,
        inputKey,
        fileName: file.name
      });

      // 3 — Start MediaConvert
      this.updateJob(job.id, { status: 'Submitted' });
      const mcJobId = await this.videoService.startMediaConvert(inputKey);
      this.updateJob(job.id, { mediaConvertJobId: mcJobId });

    } catch (err: any) {
      this.updateJob(job.id, {
        status: 'Error',
        errorMsg: err.message
      });
    }
  }

  private startPolling() {
    if (this.pollInterval) return;
    this.pollingActive = true;

    this.pollInterval = setInterval(async () => {
      const active = this.jobs.filter(
        j => ['Submitted', 'Progressing'].includes(j.status) && j.mediaConvertJobId
      );

      // Stop polling when nothing is active
      if (active.length === 0) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
        this.pollingActive = false;
        this.cdr.detectChanges();
        return;
      }

      for (const job of active) {
        try {
          const { status, progress, outputKey } =
            await this.videoService.getJobStatus(job.mediaConvertJobId!);

          if (status === 'COMPLETE' && outputKey) {
            this.updateJob(job.id, {
              status: 'Complete',
              progress: 100,
              outputUrl: this.videoService.getOutputUrl(outputKey)
            });
          } else if (status === 'ERROR' || status === 'CANCELED') {
            this.updateJob(job.id, {
              status: 'Error',
              errorMsg: 'MediaConvert job failed'
            });
          } else if (status === 'PROGRESSING') {
            this.updateJob(job.id, {
              status: 'Progressing',
              progress
            });
          }
        } catch {}
      }

      this.cdr.detectChanges();
    }, 5000);
  }

  private updateJob(id: string, changes: Partial<VideoJob>) {
    this.jobs = this.jobs.map(j => j.id === id ? { ...j, ...changes } : j);
    this.cdr.detectChanges();
  }

  async retryJob(job: VideoJob) {
    const file = this.retryFiles.get(job.id);
    if (!file) return;
    this.updateJob(job.id, { status: 'Queued', errorMsg: '', progress: 0 });
    this.processJob(job, file);
    this.startPolling();
  }

  playVideo(job: VideoJob) {
    this.activeVideoUrl = job.outputUrl || '';
    this.activeVideoName = job.fileName;
    this.cdr.detectChanges();
  }

  closePlayer() {
    this.activeVideoUrl = '';
    this.activeVideoName = '';
  }

  statusColor(status: string): string {
    const map: any = {
      Queued: '#999', Uploading: '#007bff',
      Submitted: '#17a2b8', Progressing: '#6f42c1',
      Complete: '#2e7d32', Error: '#dc3545'
    };
    return map[status] || '#333';
  }

  statusIcon(status: string): string {
    const map: any = {
      Queued: '🕐', Uploading: '⬆️', Submitted: '📤',
      Progressing: '⏳', Complete: '✅', Error: '❌'
    };
    return map[status] || '';
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
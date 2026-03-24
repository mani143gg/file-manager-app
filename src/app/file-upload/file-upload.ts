import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../services/file';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width:750px; margin:40px auto; font-family:sans-serif; padding:0 1rem">

      <h2>📁 File Manager — AWS S3</h2>

      <!-- Upload box -->
      <div style="border:2px dashed #ccc; border-radius:8px;
                  padding:1.5rem; text-align:center; margin-bottom:1rem">
        <input type="file" (change)="onFileSelect($event)" #fileInput style="display:none"/>
        <button (click)="fileInput.click()"
                style="padding:8px 20px; cursor:pointer; margin-bottom:8px">
          Choose File
        </button>
        <p style="color:#555; font-size:14px; margin:0">
          {{ selectedFile ? selectedFile.name : 'No file selected' }}
        </p>
      </div>

      <!-- Upload button -->
      <button
        (click)="upload()"
        [disabled]="!selectedFile || loading"
        style="width:100%; padding:12px; font-size:16px;
               background:#007bff; color:white; border:none;
               border-radius:6px; cursor:pointer; margin-bottom:1rem">
        {{ loading ? '⏳ Uploading...' : 'Upload to S3' }}
      </button>

      <!-- Message -->
      <p *ngIf="message"
         [style.color]="success ? 'green' : 'red'"
         style="font-weight:500; margin-bottom:1.5rem">
        {{ message }}
      </p>

      <!-- File table -->
      <div style="display:flex; justify-content:space-between; align-items:center">
        <h3 style="margin:0">Uploaded Files</h3>
        <button (click)="loadFiles()"
                style="padding:6px 14px; font-size:13px; cursor:pointer">
          🔄 Refresh
        </button>
      </div>

      <!-- Loading state -->
      <p *ngIf="tableLoading" style="color:#999; margin-top:1rem">
        Loading files...
      </p>

      <!-- Empty state -->
      <p *ngIf="!tableLoading && fileList.length === 0"
         style="color:#999; margin-top:1rem">
        No files uploaded yet.
      </p>

      <!-- Table -->
      <table *ngIf="!tableLoading && fileList.length > 0"
             style="width:100%; border-collapse:collapse;
                    font-size:14px; margin-top:1rem">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:left">#</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:left">File Name</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:left">Size</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:left">Uploaded On</th>
            <th style="padding:10px 12px; border:1px solid #ddd; text-align:center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let f of fileList; let i = index"
              [style.background]="i % 2 === 0 ? '#fff' : '#fafafa'">
            <td style="padding:10px 12px; border:1px solid #ddd; color:#999">
              {{ i + 1 }}
            </td>
            <td style="padding:10px 12px; border:1px solid #ddd">
              {{ f.name }}
            </td>
            <td style="padding:10px 12px; border:1px solid #ddd; color:#555">
              {{ f.size }}
            </td>
            <td style="padding:10px 12px; border:1px solid #ddd; color:#555">
              {{ f.date }}
            </td>
            <td style="padding:10px 12px; border:1px solid #ddd; text-align:center">
              <a [href]="f.url" target="_blank"
                 style="color:#007bff; margin-right:16px;
                        text-decoration:none; font-weight:500">
                Open
              </a>
              <span (click)="deleteFile(f.key)"
                    style="color:red; cursor:pointer; font-weight:500">
                Delete
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f5f5f5">
            <td colspan="5"
                style="padding:8px 12px; border:1px solid #ddd;
                       font-size:13px; color:#555; text-align:right">
              {{ fileList.length }} file(s) total
            </td>
          </tr>
        </tfoot>
      </table>

    </div>
  `
})
export class FileUploadComponent implements OnInit {
  selectedFile: File | null = null;
  message = '';
  success = false;
  loading = false;
  tableLoading = false;
  fileList: any[] = [];

  constructor(
    private fileService: FileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.loadFiles(); }

  onFileSelect(event: any) {
    this.selectedFile = event.target.files[0];
    this.message = '';
  }

  async upload() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.message = '';
    this.cdr.detectChanges();

    try {
      await this.fileService.uploadToS3(this.selectedFile);
      this.message = '✅ Uploaded successfully!';
      this.success = true;
      this.selectedFile = null;
      this.loading = false;
      this.cdr.detectChanges();
      this.loadFiles();                 // refresh table in background
    } catch (err: any) {
      this.message = '❌ Failed: ' + err.message;
      this.success = false;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadFiles() {
    this.tableLoading = true;
    this.cdr.detectChanges();
    try {
      this.fileList = await this.fileService.listFiles();
    } catch {
      this.fileList = [];
    } finally {
      this.tableLoading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteFile(key: string) {
    if (!confirm('Delete this file?')) return;
    try {
      await this.fileService.deleteFile(key);
      this.message = '🗑️ File deleted!';
      this.success = true;
      this.cdr.detectChanges();
      this.loadFiles();
    } catch (err: any) {
      this.message = '❌ Delete failed: ' + err.message;
      this.success = false;
      this.cdr.detectChanges();
    }
  }
}
import { Component, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload';
import { RouterOutlet } from '@angular/router';
import { VideoUploadComponent } from './video-upload/video-upload';


@Component({
  selector: 'app-root',
  imports: [FileUploadComponent, VideoUploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('file-manager-app');
}

import { Component, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [FileUploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('file-manager-app');
}

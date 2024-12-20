import { Injectable } from '@angular/core'; 
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'; //import Capacitor dependencies
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  
  constructor() { }
  public photos: UserPhoto[] = [];
  private Photo_Storage: string = "photos";
  private async readAsBase64(photo: Photo) {
    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    return await this.convertBlobToBase64(blob) as string;
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    return {
      filepath: fileName,
      webviewPath: photo.webPath
    };
  }

  public async addNewToGallery() {
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);
    Preferences.set({
      key: this.Photo_Storage,
      value: JSON.stringify(this.photos)
    });
  }

  public async loadSaved() {
    const {value} = await Preferences.get({key: this.Photo_Storage});
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];
    // Display the photos by placing the newest photo at the front of the list
    for(let photo of this.photos) {
      const readFile = await Filesystem.readFile({
        path: photo.filepath, 
        directory: Directory.Data,
      });
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
    }
  } 
}

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}


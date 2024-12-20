import { Injectable } from '@angular/core'; 
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'; //import Capacitor dependencies
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
@Injectable({
  providedIn: 'root'
})

export class PhotoService {
  
  public photos: UserPhoto[] = [];
  private Photo_Storage: string = "photos";
  private platform: Platform;
  constructor(platform: Platform) {
    this.platform = platform;
   }
  private async readAsBase64(photo: Photo) {
    if(this.platform.is('hybrid')) {
      const file = await Filesystem.readFile({
        path: photo.path!,
      });
      return file.data;
    } else {
    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    return await this.convertBlobToBase64(blob) as string;
    }
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
    if(this.platform.is('hybrid')) {
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      }
    } 
    else {
      return {
        filepath: fileName,
        webviewPath: photo.webPath
      };
    }
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
    if (this.platform.is('hybrid')) {
      for (let photo of this.photos) {
        const readFile = await Filesystem.readFile({
          path: photo.filepath, 
          directory: Directory.Data,
        });
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    } 
  }
}
export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}


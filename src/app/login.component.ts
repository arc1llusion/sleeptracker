import { Component, NgZone } from '@angular/core';
import { MemoryStorageService } from './memory-storage.service';
import { Router } from '@angular/router';
declare var google: any;

@Component({
    templateUrl: './login.component.html'
})
export class LoginComponent {

    constructor(private zone: NgZone, private memoryStorageService: MemoryStorageService, private router: Router) { }

    public isgApiLoaded: boolean = false;
    public client?: any;

    public async ngOnInit() {
        this.zone.run(async () => {      
            console.log(google);      
            this.client = google.accounts.oauth2.initTokenClient({
                client_id: '134331987353-p143afnir7vo3ti18so81esq2r3i523u.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
                callback: (response: any) => {
                    this.memoryStorageService.updateAccessToken(response.access_token);

                    this.router.navigateByUrl('/');
                },
            });
            
            this.isgApiLoaded = true;
        })
    }

    public oauthSignIn() {
        if (!this.isgApiLoaded) return;

        this.zone.run(() => {
            this.client.requestAccessToken();
        });
    }
}


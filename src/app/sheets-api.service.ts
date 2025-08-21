import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SheetsApiService {

    constructor(private http: HttpClient) { }

    public async GetLoginUrl() {
        let url = new URL(location.href);
        let host = url.host;
        let protocol = url.protocol;

        let obj: any = await lastValueFrom(this.http.get(protocol + '//' + host + '/.netlify/functions/google-login'));
        return obj.url;
    }

    public async CreateSheetIfNotExists(email: string) {
        let url = new URL(location.href);
        let host = url.host;
        let protocol = url.protocol;

        let response: any = await lastValueFrom(this.http.get(protocol + '//' + host + '/.netlify/functions/sheets-create?email=' + email));
        return response.spreadsheetId;
    }

    public async GetData(email: string, spreadsheetId: string): Promise<[]> {
        let url = new URL(location.href);
        let host = url.host;
        let protocol = url.protocol;

        let response: any = await lastValueFrom(this.http.get(protocol + '//' + host + '/.netlify/functions/sheets-get-data?email=' + email + '&spreadsheetId=' + spreadsheetId))

        return response.data ?? [];
    }

    public async UpdateData(email: string, spreadsheetId: string, values: any[]) {
        let url = new URL(location.href);
        let host = url.host;
        let protocol = url.protocol;

        let range = 'A1:C' + (values.length + 1).toString();
        let sValues = JSON.stringify(values);
        let response: any = await lastValueFrom(this.http.get(protocol + '//' + host + '/.netlify/functions/sheets-update-data?email=' + email + '&spreadsheetId=' + spreadsheetId + '&range=' + encodeURIComponent(range) + '&values=' + encodeURIComponent(sValues)));
    }
}
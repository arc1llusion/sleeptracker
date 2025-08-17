import { Injectable } from '@angular/core';
 import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

declare var gapi: any;
export class Spreadsheet
{
    spreadsheetId: string | null = null;
    properties: SpreadsheetProperties | null = null
}

export class ListResponse 
{
    id: string | null = null;
}

export class SpreadsheetProperties 
{
    title: string | null = null;
}

export enum MajorDimension 
{
    ROWS="ROWS",
    COLUMNS="COLUMNS"
}

export class ValueRange
{
    range: string;
    majorDimension: MajorDimension;
    values: any[];

    constructor(range: string, majorDimension: MajorDimension, values: any[])
    {
        this.range = range;
        this.majorDimension = majorDimension;
        this.values = values;
    }   
}


@Injectable({
    providedIn: 'root'
})
export class SheetsApiService {

    private readonly SheetName = "Sleep Tracker";
    private sheetId: string | null = null;

    private sheetsEndpoint: string = 'https://sheets.googleapis.com/v4/'
    private driveFilesEndpoint: string = 'https://www.googleapis.com/drive/v3/'

    constructor(private http: HttpClient) {}

    public async ListFiles(accessToken: string) : Promise<ListResponse[]>
    {        
        try {
            let response:any = await lastValueFrom(this.http.get(this.driveFilesEndpoint + 'files?q=name+%3d+%27' + this.SheetName + '%27', {
                headers: {
                    'Authorization' : 'Bearer ' + accessToken
                }
            }));

            return Promise.resolve(response.files);
        }
        catch(e)
        {
            return Promise.reject(e);
        }
    }

    public async CreateSheetIfNotExists(accessToken: string) 
    {
        let files = await this.ListFiles(accessToken);

        if(files.length == 0)
        {
            let ss = new Spreadsheet();
            ss.properties = { title: "Sleep Tracker" }
            let response: any = await lastValueFrom(this.http.post([this.sheetsEndpoint, 'spreadsheets'].join(''), JSON.stringify(ss), { headers: {
                'Authorization' : 'Bearer ' + accessToken
            }}));

            this.sheetId = response.spreadsheetId;
        }
        else if(files.length >= 1) {
            this.sheetId = files[0].id;
        }
    }

    public async GetData(accessToken: string) : Promise<[]>
    {
        let response:any = await lastValueFrom(this.http.get(this.sheetsEndpoint + 'spreadsheets/' + this.sheetId + '/values/A%3AB', {
            headers: {
                'Authorization' : 'Bearer ' + accessToken
            }
        }));

        return response.values;
    }

    public async UpdateData(accessToken: string, values: any[])
    {
        let vr: ValueRange = new ValueRange('A1:B' + (values.length + 1), MajorDimension.ROWS, values);

        try {
            console.log('hello');
            let v = lastValueFrom(this.http.put(this.sheetsEndpoint + 'spreadsheets/' + this.sheetId + '/values/A1%3AB' + (values.length + 1) + '?valueInputOption=USER_ENTERED', JSON.stringify(vr), {
                headers: {
                    'Authorization' : 'Bearer ' + accessToken
                }
            }));

            return Promise.resolve(v);
        }
        catch(e)
        {
            return Promise.reject(e);
        }
    }
}
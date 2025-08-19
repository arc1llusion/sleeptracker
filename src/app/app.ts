import { Component, NgZone, signal } from '@angular/core';
import { Form, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterOutlet } from '@angular/router';
import { MemoryStorageService } from './memory-storage.service';
import { SheetsApiService } from './sheets-api.service';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, NativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';

declare var google: any;

@Component({
	selector: 'app-root',
	imports: [
		RouterOutlet,
		CommonModule,
		ReactiveFormsModule,
		MatButtonModule,
		MatIconModule,
		MatInputModule,
		MatTableModule,
		MatFormFieldModule,
		MatDatepickerModule,
		MatNativeDateModule,
		NativeDateModule
	],
	templateUrl: './app.html',
	styleUrl: './app.scss'
})
export class App {
	protected readonly title = signal('sleeptracker');

	isLoggedIn: boolean = false;
	private accessToken: string | null = null;
	public data: any[] = [];
	public displayedColumns = ["date", "hours", "notes"];

	public dataSource = new MatTableDataSource<any[]>();
	public totalHoursLast30Days = 0;

	public isgApiLoaded: boolean;
	public client?: any;

	public addHoursForm: FormGroup;

	public Status: string = '';
	public StartupStatus: string = '';

	constructor(private zone: NgZone, private router: Router, private formBuilder: FormBuilder, private memoryStorageService: MemoryStorageService, private sheets: SheetsApiService) {
		let date = new Date(Date.now());
		date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);

		this.addHoursForm = this.formBuilder.group({
			date: [date, Validators.required],
			hours: [0],
			notes: ''
		});

		this.isgApiLoaded = false;
	}

	public async ngOnInit() {
		this.memoryStorageService.AccessTokenObservable.subscribe((value) => {
			this.isLoggedIn = value ? true : false;
			this.accessToken = value;

			if (this.isLoggedIn) {
				this.sheets.CreateSheetIfNotExists(this.accessToken!).then(() => {
					this.sheets.GetData(this.accessToken!).then((d) => {
						this.data = d ?? [];
						this.dataSource.data = d ?? [];
					});
				});
			}
		});

	}

	public ngAfterContentChecked() 
	{
		if(this.isgApiLoaded) return;

		if(typeof google === 'undefined')
		{
			this.StartupStatus = 'Google API couldn\'t be loaded';
			return;
		}

		this.client = google.accounts.oauth2.initTokenClient({
			client_id: '134331987353-p143afnir7vo3ti18so81esq2r3i523u.apps.googleusercontent.com',
			scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
			callback: (response: any) => {
				this.memoryStorageService.updateAccessToken(response.access_token);

				this.router.navigateByUrl('/');
			},
		});

		this.isgApiLoaded = true;
	}

	public oauthSignIn() {
		if (!this.isgApiLoaded) return;

		this.zone.run(() => {
			this.client.requestAccessToken();
		});
	}

	public async AddHours() {
		console.log(this.addHoursForm);
		
		let date = this.addHoursForm.get('date')?.value.toISOString().substring(0, 10);
		let hours = this.addHoursForm.get('hours')?.value;
		let notes = this.addHoursForm.get('notes')?.value;

		if(isNaN(hours))
		{
			this.Status = "Hours should be a number, fool."
			return;
		}

		this.zone.run(() => {


			let idx = this.data.findIndex((f) => {
				return f[0] == date;
			});

			if (idx == -1) {
				this.data.push([date, hours, notes]);
			}
			else {
				this.data[idx][1] = hours;
				this.data[idx][2] = notes;
			}

			this.data = this.data.sort((a, b) => {
				return a == b ? 0 : a > b ? -1 : 1;
			});

			let newDate = new Date(Date.now());
			newDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate() - 1);

			this.addHoursForm.reset({
				date: newDate,
				hours: 0,
				notes: ''
			});

			for (let i = 0; i < this.data.length; ++i) {
				if (this.data[i].length == 2) {
					this.data[i].push('');
				}
			}

			this.dataSource.data = this.data;
		});

		this.sheets.UpdateData(this.accessToken!, this.data).then(() => {
			this.Status = "Hours submitted!"
		}).catch((e) => {
			this.Status = e.error.error.message;
		});
	}

	public async GrabData() {
		this.data = await this.sheets.GetData(this.accessToken!);
	}

	public FilterLast30DaysAndCalculateTotalHours()
	{
		let newDate = new Date(Date.now());
		newDate = new Date(newDate.setDate(newDate.getDate() - 30));
		let filtered = this.data.filter((d) => 
		{
			return d[0] >= newDate;
		});

		this.dataSource.data = filtered;
		this.totalHoursLast30Days = 0;

		for(let i = 0; i < filtered.length; ++i) 
		{
			this.totalHoursLast30Days += filtered[1];
		}
	}
}

import { Component, NgZone, signal } from '@angular/core';
import { Form, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterOutlet } from '@angular/router';
import { SheetsApiService } from './sheets-api.service';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, NativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';

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
		NativeDateModule,
		NgxChartsModule
	],
	templateUrl: './app.html',
	styleUrl: './app.scss'
})
export class App {
	protected readonly title = signal('sleeptracker');

	isLoggedIn: boolean = false;
	
	public data: any[] = [];
	public displayedColumns = ["date", "hours", "notes"];

	public dataSource = new MatTableDataSource<any[]>();
	public totalHoursLast30Days = 0;
	public averagePerNight = 0;
	public chartData: any;

	public client?: any;

	public addHoursForm: FormGroup;

	public Status: string = '';
	public StartupStatus: string = '';

	private lastTimeLoggedIn: number | null = null;

	public loginUrl: string = '';

	private email: string | null = null;
	private spreadsheetId: string | null = null;

	public chartColorScheme: Color = {
		name: 'myScheme',
		selectable: true,
		group: ScaleType.Ordinal,
		domain: ['#7AA3E5'],
	};

	constructor(private zone: NgZone, private router: Router, private formBuilder: FormBuilder, private sheets: SheetsApiService) {
		let date = new Date(Date.now());
		date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);

		this.addHoursForm = this.formBuilder.group({
			date: [date, Validators.required],
			hours: [0],
			notes: ''
		});
	}

	public async ngOnInit() 
	{
		let url = new URL(location.href);
		let params = new URLSearchParams(url.search);
		let email = params.get('email');

		if(email)
		{
			localStorage.setItem('email', email);
		}

		email = localStorage.getItem('email');
		if(email)
		{
			this.email = email;

			this.spreadsheetId = localStorage.getItem('spreadsheetId');
			if(!this.spreadsheetId)
			{
				this.spreadsheetId = await this.sheets.CreateSheetIfNotExists(email);
				localStorage.setItem('spreadsheetId', this.spreadsheetId!);
			}			

			await this.GrabData();

			this.isLoggedIn = true;
		}
		else
		{
			this.isLoggedIn = false;
			this.loginUrl = await this.sheets.GetLoginUrl();
		}
	}

	public async AddHours() 
	{		
		if(this.lastTimeLoggedIn != null && Date.now() - this.lastTimeLoggedIn > 900000)
		{
			this.isLoggedIn = false;
			return;
		}

		let tempData = this.data.slice();

		let date = this.addHoursForm.get('date')?.value.toISOString().substring(0, 10);
		let hours = this.addHoursForm.get('hours')?.value;
		let notes = this.addHoursForm.get('notes')?.value;

		if(isNaN(hours))
		{
			this.Status = "Hours should be a number, fool."
			return;
		}

		this.zone.run(() => {


			let idx = tempData.findIndex((f) => {
				return f[0] == date;
			});

			if (idx == -1) {
				tempData.push([date, hours, notes]);
			}
			else {
				tempData[idx][1] = hours;
				tempData[idx][2] = notes;
			}

			tempData = tempData.sort((a, b) => {
				return a == b ? 0 : a > b ? -1 : 1;
			});

			let newDate = new Date(Date.now());
			newDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate() - 1);

			this.addHoursForm.reset({
				date: newDate,
				hours: 0,
				notes: ''
			});

			for (let i = 0; i < tempData.length; ++i) {
				if (tempData[i].length == 2) {
					tempData[i].push('');
				}
			}
		});

		this.sheets.UpdateData(this.email!, this.spreadsheetId!, tempData).then(() => {
			this.Status = "Hours submitted!"
			this.zone.run(() => {
				this.data = tempData.slice();
				this.FilterLast30DaysAndCalculateTotalHours();
			});
		}).catch((e) => {
			this.Status = e.error.error.message;
		});
	}

	public async GrabData() 
	{
		if(this.email)
		{
			let response = await this.sheets.GetData(this.email, this.spreadsheetId!);

			if(typeof response == 'boolean')
			{
				localStorage.clear();
			}
			else {
				this.data = response;
				this.FilterLast30DaysAndCalculateTotalHours();
			}			
		}
	}

	public FilterLast30DaysAndCalculateTotalHours()
	{
		let newDate = new Date(Date.now());
		newDate = new Date(newDate.setDate(newDate.getDate() - 30));
		let filtered = this.data.filter((d) => 
		{
			return new Date(d[0]) >= newDate;
		});

		this.dataSource.data = filtered;
		this.totalHoursLast30Days = 0;

		for(let i = 0; i < filtered.length; ++i) 
		{
			this.totalHoursLast30Days += Number.parseFloat(filtered[i][1]);
		}

		this.averagePerNight = this.totalHoursLast30Days / filtered.length;

		let localChartDate = filtered.map((f) => {
			return {
				name: new Date(f[0] + "T00:00:00"), //necessary to prevent weird JS date shenanigans
				value: Number.parseFloat(f[1])
			};
		});

		localChartDate.sort((a: any, b: any) => {
			return a.name == b.name ? 0 : a.name < b.name ? -1 : 1;
		});

		let earliestDate = localChartDate[0].name;
		let leadingDatesNeeded = 30 - localChartDate.length;

		for(let i = 0; i < leadingDatesNeeded; ++i)
		{
			earliestDate = new Date(earliestDate.setDate(earliestDate.getDate() - 1));

			localChartDate.splice(0, 0, {
				name: earliestDate,
				value: 0
			});
		}		

		this.chartData = localChartDate;
	}
}

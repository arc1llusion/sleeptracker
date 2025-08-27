import { Component, NgZone, signal } from '@angular/core';
import { formatDate } from '@angular/common'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterOutlet } from '@angular/router';
import { SheetsApiService } from './sheets-api.service';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatNativeDateModule, NativeDateModule } from '@angular/material/core';
import { CommonModule, DatePipe } from '@angular/common';
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
		MatProgressSpinnerModule,
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
	public lineChartData: any;

	public addHoursForm: FormGroup;

	public Status: string = '';
	public StartupStatus: string = '';

	private lastTimeLoggedIn: number | null = null;

	public loginUrl: string = '';

	private email: string | null = null;
	private spreadsheetId: string | null = null;

	public submittingHours: boolean = false;

	public chartColorScheme: Color = {
		name: 'chartScheme',
		selectable: true,
		group: ScaleType.Ordinal,
		domain: ['#7AA3E5'],
	};

	public lineChartColorScheme: Color = {
		name: 'lineChartScheme',
		selectable: true,
		group: ScaleType.Ordinal,
		domain: ['#125f0b'],
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
		this.SetUp();
	}

	public async SetUp() 
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

			if(await this.GrabData())
			{
				this.isLoggedIn = true;
			}
		}
		else
		{
			this.isLoggedIn = false;
			this.loginUrl = await this.sheets.GetLoginUrl();
		}
	}

	public async Logout()
	{
		localStorage.clear();
		this.isLoggedIn = false;
		this.loginUrl = await this.sheets.GetLoginUrl();
	}

	public async AddHours() 
	{		
		try 
		{
			this.submittingHours = true;
			this.Status = '';

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

				this.submittingHours = false;
			}).catch((e) => {
				this.Status = e.error.error.message;
				this.submittingHours = false;
			});
		}
		catch(e: any) 
		{
			this.submittingHours = false;
			this.Status = e.message;
		}
	}

	public async GrabData() : Promise<boolean>
	{
		if(this.email)
		{
			let response = await this.sheets.GetData(this.email, this.spreadsheetId!);
			if(typeof response == 'boolean')
			{
				localStorage.clear();
				this.isLoggedIn = false;
				this.loginUrl = await this.sheets.GetLoginUrl();
				return false;
			}
			else {
				this.data = response ?? [];
				this.FilterLast30DaysAndCalculateTotalHours();
				return true;
			}			
		}

		return false;
	}

	public FilterLast30DaysAndCalculateTotalHours()
	{
		if(!this.data || this.data.length == 0)
		{
			return;
		}

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

		let localChartData = filtered.map((f) => {
			return {
				name: new Date(f[0] + "T00:00:00"), //necessary to prevent weird JS date shenanigans
				value: Number.parseFloat(f[1]),
				extra: f[2] ?? ''
			};
		});		

		if(localChartData.length > 0)
		{
			let lastDate = new Date(localChartData[0].name.getFullYear(), localChartData[0].name.getMonth(), localChartData[0].name.getDate());
			for(let i = 1; i < localChartData.length; ++i)
			{	
				lastDate.setDate(lastDate.getDate() - 1);

				if(lastDate.getFullYear() != localChartData[i].name.getFullYear() ||
				   lastDate.getMonth() != localChartData[i].name.getMonth() ||
				   lastDate.getDate() != localChartData[i].name.getDate() )
				{					
					localChartData.splice(i, 0, {
						name: new Date(lastDate.toDateString()),
						value: 0,
						extra: ''
					});
				}
			}
		}

		localChartData.sort((a: any, b: any) => {
			return a.name == b.name ? 0 : a.name < b.name ? -1 : 1;
		});

		this.chartData = localChartData;
				
		//Find average over time
		let averageOverTimeData = [];
		for(let i = 0; i < localChartData.length; ++i)
		{
			let sum = 0;
			for(let j = 0; j <= i; ++j)
			{
				sum += localChartData[j].value;
			}

			averageOverTimeData.push({
				name: localChartData[i].name,
				value: sum / (i + 1)
			});
		}

		this.lineChartData = [
			{
				name: "Average Over Time",
				series: averageOverTimeData
			}
		];

		console.log(this.lineChartData);

		//Add empty days
		let earliestDate = new Date(localChartData[0].name.toDateString());
		let leadingDatesNeeded = 30 - localChartData.length;

		for(let i = 0; i < leadingDatesNeeded; ++i)
		{
			earliestDate = new Date(earliestDate.setDate(earliestDate.getDate() - 1));

			localChartData.splice(0, 0, {
				name: new Date(earliestDate.toDateString()),
				value: 0,
				extra: ''
			});
		}		
	}

	public formatDate(val: any) 
	{
		return formatDate(val, 'MM/dd/yyyy', 'en-US');
	}
}

import { Component } from '@angular/core';
import { MemoryStorageService } from './memory-storage.service';
import { SheetsApiService } from './sheets-api.service';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  title = 'angular-quickstart';

	isLoggedIn: boolean = false;
	private accessToken : string | null = null;
	public data: any[] = [];
	public displayedColumns = ["date", "hours"];

	public addHoursForm = this.formBuilder.group({
		date: [new Date(Date.now()).toISOString().substring(0, 10), Validators.required],
		hours: [0, Validators.pattern("^[0-9]*$")],		
	});

	constructor(private formBuilder: FormBuilder, private memoryStorageService: MemoryStorageService, private sheets: SheetsApiService) {}

	public async ngOnInit() 
	{
		this.memoryStorageService.AccessTokenObservable.subscribe((value) => 
		{
			this.isLoggedIn = value ? true : false;
			this.accessToken = value;

			if(this.isLoggedIn)
			{
				this.sheets.CreateSheetIfNotExists(this.accessToken!).then(() => {
					this.sheets.GetData(this.accessToken!).then((d) => {
						this.data = d;
					});
				});
			}
		});
	}

	public async AddHours() 
	{
		let date = this.addHoursForm.get('date')?.value;
		let hours = this.addHoursForm.get('hours')?.value;

		let idx = this.data.findIndex((f) => {
			return f[0] == date;
		});

		if(idx == -1)
		{
			this.data.push([date, hours]);
		}
		else
		{
			this.data[idx][1] = hours;
		}

		this.data = this.data.sort((a, b) => {
			return a == b ? 0 : a > b ? -1 : 1;
		});

		this.sheets.UpdateData(this.accessToken!, this.data);
	}

	public async GrabData() 
	{
		this.data = await this.sheets.GetData(this.accessToken!);
	}
}


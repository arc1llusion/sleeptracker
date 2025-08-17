import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MemoryStorageService } from './memory-storage.service';

@Component({
	templateUrl: './callback.component.html'
})
export class CallbackComponent {
	constructor(private router: Router, private route: ActivatedRoute, private memoryStorageService: MemoryStorageService) {}

	ngOnInit(): void {
		this.route.queryParams.subscribe((qp) => {
			console.log(qp);
		});
		
		this.route.fragment.subscribe((fragment: string | null) => {
			if(!fragment) return;

			const access_token = new URLSearchParams(fragment).get('access_token');

			if(access_token) 
			{
				this.memoryStorageService.updateAccessToken(access_token);
			}

			this.router.navigateByUrl('/');
		});
	}
}

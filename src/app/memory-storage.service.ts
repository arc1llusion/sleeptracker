import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class MemoryStorageService {
	public readonly AccessTokenObservable = new Subject<string | null>();

	public updateAccessToken(accessToken: string | null)
	{
		this.AccessTokenObservable.next(accessToken);
	}
}
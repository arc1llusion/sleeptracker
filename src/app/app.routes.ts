import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { CallbackComponent } from './callback.component';

export const routes: Routes = [
{
	path: 'login',
	component: LoginComponent
},
{
	path: 'callback',
	component: CallbackComponent
}];

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CallbackComponent } from './callback.component';
import { LoginComponent } from './login.component';

const routes: Routes = [
{
	path: 'login',
	component: LoginComponent
},
{
	path: 'callback',
	component: CallbackComponent
}];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }

import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['../demo-styling.css']
})
export class AppComponent {
  title = 'angular-quickstart';

  	public oauthSignIn() {
		// Google's OAuth 2.0 endpoint for requesting an access token
		var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

		// Create <form> element to submit parameters to OAuth 2.0 endpoint.
		var form = document.createElement('form');
		form.setAttribute('method', 'GET'); // Send as a GET request.
		form.setAttribute('action', oauth2Endpoint);

		// Parameters to pass to OAuth 2.0 endpoint.
		var params: any = {
			'client_id': '134331987353-p143afnir7vo3ti18so81esq2r3i523u.apps.googleusercontent.com ',
			'redirect_uri': 'https://sleeptrackerarc.netlify.app/callback',
			'response_type': 'token',
			'scope': 'https://www.googleapis.com/auth/spreadsheets',
			'include_granted_scopes': 'true',
			'state': 'pass-through value'
		};

		// Add form parameters as hidden input values.
		for (var p in params) {
			var input = document.createElement('input');
			input.setAttribute('type', 'hidden');
			input.setAttribute('name', p);
			input.setAttribute('value', params[p]);
			form.appendChild(input);
		}

		// Add form to page and submit it to open the OAuth 2.0 endpoint.
		document.body.appendChild(form);
		form.submit();
	}
}


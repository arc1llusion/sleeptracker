import { Context } from '@netlify/functions'
import { google } from 'googleapis';

export default (request: Request, context: Context) => {
	let oauth = new google.auth.OAuth2({
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		redirect_uris: [process.env.GOOGLE_REDIRECT_URI!]
	});

	let url = oauth.generateAuthUrl({
		access_type: 'offline',
		scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
		prompt: 'consent',
		include_granted_scopes: true
	});

	return Response.json({url: url});
}

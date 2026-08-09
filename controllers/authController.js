import crypto from 'crypto';
import User from '../models/User.js';
import { createToken } from '../utils/token.js';

const present = (user) => ({
	id: user._id,
	name: user.name,
	email: user.email,
	role: user.role,
	phone: user.phone,
	address: user.address,
});

const getClientBase = () => {
	const raw = process.env.CLIENT_URL || 'http://localhost:3000';
	return raw.split(',')[0].trim().replace(/\/$/, '');
};

const getGoogleConfig = () => ({
	clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
	clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
	redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
});

export const register = async (req, res) => {
	const exists = await User.findOne({ email: req.body.email });
	if (exists) return res.status(409).json({ message: 'Email already in use' });

	const user = await User.create({
		...req.body,
		authProvider: 'local',
	});

	res.status(201).json({ user: present(user), token: createToken(user._id) });
};

export const login = async (req, res) => {
	const user = await User.findOne({ email: req.body.email }).select('+password');
	if (!user) return res.status(401).json({ message: 'Incorrect email or password' });

	if (user.authProvider === 'google' && !user.password) {
		return res.status(400).json({ message: 'This account uses Google login. Please continue with Google.' });
	}

	if (!(await user.matchesPassword(req.body.password))) {
		return res.status(401).json({ message: 'Incorrect email or password' });
	}

	res.json({ user: present(user), token: createToken(user._id) });
};

export const profile = async (req, res) => res.json({ user: present(req.user) });

export const googleStart = async (req, res) => {
	const { clientId, redirectUri } = getGoogleConfig();
	if (!clientId || !redirectUri) {
		return res.status(500).json({ message: 'Google OAuth is not configured.' });
	}

	const returnTo = req.query.returnTo === '/signup' ? '/signup' : '/login';

	const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', 'openid email profile');
	authUrl.searchParams.set('access_type', 'online');
	authUrl.searchParams.set('prompt', 'consent');
	authUrl.searchParams.set('state', returnTo);

	res.redirect(authUrl.toString());
};

export const googleCallback = async (req, res) => {
	const code = req.query.code;
	const { clientId, clientSecret, redirectUri } = getGoogleConfig();
	const clientBase = getClientBase();

	if (!code || !clientId || !clientSecret || !redirectUri) {
		return res.redirect(`${clientBase}/login?googleError=configuration`);
	}

	try {
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code: String(code),
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}),
		});

		if (!tokenResponse.ok) {
			throw new Error('Unable to exchange Google authorization code.');
		}

		const tokenPayload = await tokenResponse.json();
		if (!tokenPayload.id_token) {
			throw new Error('Google did not return an ID token.');
		}

		const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenPayload.id_token)}`);
		if (!tokenInfoResponse.ok) {
			throw new Error('Unable to validate Google identity token.');
		}

		const googleProfile = await tokenInfoResponse.json();
		const email = googleProfile.email?.toLowerCase();
		const googleId = googleProfile.sub;
		const name = googleProfile.name || email?.split('@')[0] || 'Google User';

		if (!email || !googleId) {
			throw new Error('Google account payload is missing required fields.');
		}

		let user = await User.findOne({ email });

		if (!user) {
			user = await User.create({
				name,
				email,
				authProvider: 'google',
				googleId,
				password: crypto.randomBytes(32).toString('hex'),
			});
		} else if (!user.googleId) {
			user.googleId = googleId;
			if (user.authProvider !== 'local') user.authProvider = 'google';
			await user.save();
		}

		const token = createToken(user._id);
		const returnTo = req.query.state === '/signup' ? '/signup' : '/login';
		res.redirect(`${clientBase}${returnTo}?token=${encodeURIComponent(token)}&provider=google`);
	} catch (error) {
		res.redirect(`${clientBase}/login?googleError=failed`);
	}
};

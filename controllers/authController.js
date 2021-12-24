const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const send = require('./../utils/mailService');
require('dotenv').config({ path: '../config.env' });
exports.signIn = catchAsync(async (req, res, next) => {
	const { firstName, email, password, confirmPassword } = req.body;
	if (password !== confirmPassword) {
		return next(new AppError(`passwords doesnot match`, 401));
	}
	const at = crypto.randomBytes(64).toString('hex');
	const hashed = await bcrypt.hash(password, 12);
	const user = await User.create({
		firstName,
		email,
		password: hashed,
		activationToken: crypto.createHash('sha256').update(at).digest('hex'),
	});
	const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
		expiresIn: parseInt(process.env.JWT_EXPIRES_IN) * 60 * 60 * 24,
	});
	res.cookie('jwt', token, {
		expires: new Date(
			Date.now() +
				parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
	});
	send(
		user.email,
		'activate account',
		`please activate your account ${req.protocol}://${req.get(
			'host'
		)}/api/user/activate/${at}`
	);
	user.password = undefined;
	res.json({
		success: true,
		statusCode: 201,
		message: 'we send you activation link to activate your account',
		token,
		user,
	});
});
exports.activate = catchAsync(async (req, res, next) => {
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	const user = await User.findOne({
		activationToken: hashedToken,
	});

	if (!user) {
		return next(
			new AppError("Invalid Token , please don't mess with us", 400)
		);
	}
	user.activated = true;
	user.activationToken = undefined;
	await user.save();
	return res.send({
		message: 'success',
	});
});

exports.auth = catchAsync(async (req, res, next) => {
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	}
	if (!token) {
		return next(
			new AppError(
				'You are not logged in! Please log in to get access.',
				401
			)
		);
	}

	// 2) Verification token
	let decoded;
	jwt.verify(token, process.env.JWT_SECRET, (err, dec) => {
		if (err) {
			throw new AppError('Invalid Token or your Token has expired', 401);
		}
		decoded = dec;
	});

	// 3) Check if user still exists
	// @ts-ignore
	const currentUser = await User.findById(decoded.id).select('+activated');
	if (!currentUser) {
		return next(
			new AppError(
				'The user belonging to this token does no longer exist.',
				401
			)
		);
	}
	if (!currentUser.activated) {
		return next(new AppError('activate account to access this url', 401));
	}
	// @ts-ignore
	if (currentUser.passwordChangedAt.getTime() / 1000 > decoded.iat) {
		return next(
			new AppError(
				'User recently changed password! Please log in again.',
				401
			)
		);
	}

	// GRANT ACCESS TO PROTECTED ROUTE
	//  console.log(req.secure, req.headers['x-forwarded-proto']=="https" );
	req.user = currentUser;
	res.locals.user = currentUser;
	next();
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email }).select(
		'-active -activated +password'
	);
	if (!user) {
		throw new AppError('email or password wrong');
	}
	// @ts-ignore
	const result = await bcrypt.compare(password, user.password);
	// @ts-ignore
	if (!result) {
		throw new AppError('email or password wrong');
	}

	// @ts-ignore
	const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
		expiresIn: parseInt(process.env.JWT_EXPIRES_IN) * 60 * 60 * 24,
	});
	res.cookie('jwt', token, {
		expires: new Date(
			Date.now() +
				parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
	});
	// @ts-ignore
	user.password = undefined;
	res.json({
		success: true,
		statusCode: 201,
		message: 'You successfully logged in',
		token,
		user,
	});
});
exports.logout = catchAsync(async (req, res, next) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});
	res.status(200).json({ status: 'success' });
});
exports.forgotPassword = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		return next(new AppError('there is not  email named that', 401));
	}

	const resetToken = crypto.randomBytes(64).toString('hex');
	user.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');
	user.passwordResetExpires = new Date(new Date().getTime() + 1000 * 60 * 10);
	await user.save();
	try {
		const resetURL = `${req.protocol}://${req.get(
			'host'
		)}/api/user/resetPassword/${resetToken}`;
		send(user.email, 'reset password', resetURL);

		res.status(200).json({
			status: 'success',
			message: 'Token sent to email!',
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save();

		return next(
			new AppError('There was an error sending the email. Try again later!'),
			500
		);
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// 1) Get user based on the token
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() },
	});

	// 2) If token has not expired, and there is user, set the new password
	if (!user) {
		return next(new AppError('Token is invalid or has expired', 400));
	}
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	await user.save();
	const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
		expiresIn: parseInt(process.env.JWT_EXPIRES_IN) * 60 * 60 * 24,
	});
	res.json({
		message: 'successfully updated',
		token,
	});
});
exports.isAdmin = catchAsync(async (req, res, next) => {
	if (req.user.role === 'admin') {
		return next();
	}
	throw new AppError('You dont have permisson to this operation', 401);
});

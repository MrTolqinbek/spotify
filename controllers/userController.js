const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const fs = require('fs/promises');
const path = require('path');
const AppError = require('../utils/appError');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../config.env' });

const multer = require('multer');
const sharp = require('sharp');
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(new AppError('Not an image! Please upload only images.', 400), false);
	}
};

const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
	if (!req.file) return next();

	req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

	await sharp(req.file.buffer)
		.resize(500, 500)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/userimg/${req.file.filename}`);

	next();
});
exports.updateImage = catchAsync(async (req, res, next) => {
	const user = await User.findOne({
		_id: req.user._id,
	});
	if (!user) {
		throw new AppError('user with this id doesnot exist');
	}

	if (user.photo != 'userimg/default.jpeg') {
		await fs.unlink(path.join(path.resolve(), 'public', user.photo));
	}
	user.photo = `userimg/${req.file.filename}`;

	await user.save();
	res.status(200).json({
		message: 'succesfully updated',
		data: {
			user,
		},
	});
});

// exports.create = catchAsync(async (req, res, next) => {
// 	const portfolio = await Portfolio.create({ owner: req.user._id });
// 	res.status(201).json({
// 		message: 'succesfully created portfolio',
// 		data: {
// 			portfolio,
// 		},
// 	});
// });
exports.update = catchAsync(async (req, res, next) => {
	const { firstName, lastName } = req.body;
	const user = await User.findById(req.user._id);
	user.firstName = firstName;
	user.lastName = lastName;
	await user.save();
	user.password = undefined;
	res.status(201).json({
		message: 'succesfully updated info',
		data: {
			user,
		},
	});
});
exports.updateMe = catchAsync(async (req, res, next) => {
	const { email, password, newPassword, newPasswordConfirm } = req.body;
	if (newPassword !== newPasswordConfirm) {
		throw new Error('passwords didnot match');
	}
	const user = await User.findById(req.user._id).select('+password');
	const result = await bcrypt.compare(password, user.password);
	if (!result) {
		throw new Error('password is wrong');
	}
	user.email = email;
	user.password = await bcrypt.hash(newPassword, 12);
	user.passwordChangedAt = new Date();
	await user.save();
	user.password = undefined;
	res.status(201).json({
		message: 'succesfully updated info',
		data: {
			user,
		},
	});
});

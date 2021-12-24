const Playlist = require('../models/playlistModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
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

exports.uploadPhoto = upload.single('image');

exports.resizePhoto = catchAsync(async (req, res, next) => {
	if (!req.file) return next();

	req.file.filename = `playlist-${req.user.id}-${Date.now()}.jpeg`;

	await sharp(req.file.buffer)
		.resize(500, 500)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/playlistimg/${req.file.filename}`);

	next();
});
exports.updateImage = catchAsync(async (req, res, next) => {
	const playlist = await Playlist.findOne({
		_id: req.params.id,
		owner: req.user._id,
	});
	if (!playlist) {
		throw new AppError('playlist with this id doesnot exist');
	}

	if (playlist.image !== 'playlistimg/default.png') {
		await fs.unlink(path.join(path.resolve(), 'public', playlist.image));
	}
	playlist.image = `playlistimg/${req.file.filename}`;

	await playlist.save();
	res.status(200).json({
		message: 'succesfully updated',
		data: {
			playlist,
		},
	});
});

exports.create = catchAsync(async (req, res, next) => {
	const { name } = req.body;
	const playlist = await Playlist.create({ name, owner: req.user._id });
	res.status(201).json({
		message: 'succesfully created',
		data: {
			playlist,
		},
	});
});
exports.update = catchAsync(async (req, res, next) => {
	const { name } = req.body;
	const playlist = await Playlist.findOne({ _id: req.params.id });
	playlist.name = name;
	await playlist.save();
	res.status(201).json({
		message: 'succesfully created',
		data: {
			playlist,
		},
	});
});
exports.get = catchAsync(async (req, res, next) => {
	console.log(req.params.id);
	const playlist = await Playlist.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(req.params.id),
				owner: req.user._id,
			},
		},
		{
			$lookup: {
				from: 'musics',
				localField: '_id',
				foreignField: 'belongsTo',
				as: 'musics',
			},
		},
	]);
	if (!playlist) {
		throw new AppError('you dont have permission', 401);
	}
	res.status(201).json({
		message: 'succesfully created',
		data: {
			playlist: playlist[0],
		},
	});
});

exports.getAll = catchAsync(async (req, res, next) => {
	const playlists = await Playlist.aggregate([
		{
			$match: {
				owner: req.user._id,
			},
		},
		{
			$lookup: {
				from: 'musics',
				localField: '_id',
				foreignField: 'belongsTo',
				as: 'musics',
			},
		},
	]);
	res.status(200).json({
		message: 'succesfully get',
		data: {
			playlists,
		},
	});
});

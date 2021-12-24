const Music = require('../models/musicModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const fs = require('fs/promises');
const Playlist = require('../models/playlistModel');
const path = require('path');
require('dotenv').config({ path: '../config.env' });

const multer = require('multer');

const multerStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'public/audio');
	},
	filename: (req, file, cb) => {
		const ext = file.mimetype.split('/')[1];
		cb(null, `audio-${req.user.id}-${Date.now()}.${ext}`);
	},
});
const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('audio')) {
		cb(null, true);
	} else {
		cb(new AppError('Not an audio! Please upload only audio.', 400), false);
	}
};

const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter,
});

exports.uploadMusic = upload.single('music');

exports.create = catchAsync(async (req, res, next) => {
	const { name, authorFullName } = req.body;
	const music = await Music.create({
		name,
		belongsTo: req.params.id,
		authorFullName,
		source: `audio/${req.file.filename}`,
	});

	res.status(200).json({
		message: 'succesfully created',
		data: {
			music,
		},
	});
});
exports.delete = catchAsync(async (req, res, next) => {
	const music = await Music.findOne({
		_id: req.params.id2,
		belongsTo: req.params.id1,
	});
	const playlist = await Playlist.findOne({
		owner: req.user._id,
		_id: music.belongsTo,
	});
	if (!playlist) {
		throw new AppError("You don't have permision");
	}
	fs.unlink(path.join(path.resolve(), 'public', music.source));
	await Music.deleteOne({ _id: music._id });
	res.status(200).json({
		message: 'succesfully deleted',
	});
});

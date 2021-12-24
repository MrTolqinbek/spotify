const mongoose = require('mongoose');
const validator = require('validator');

const playlistSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		image: {
			type: String,
			default: 'playlistimg/default.png',
		},
	},
	{
		timestamps: true,
	}
);

const User = mongoose.model('Playlist', playlistSchema);

module.exports = User;

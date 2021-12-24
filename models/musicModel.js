const mongoose = require('mongoose');
const validator = require('validator');

const MusicSchema = new mongoose.Schema(
	{
		source: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		authorFullName: {
			type: String,
		},
		belongsTo: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Playlist',
		},
	},
	{
		timestamps: true,
	}
);

const User = mongoose.model('Music', MusicSchema);

module.exports = User;

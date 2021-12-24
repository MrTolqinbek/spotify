const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../config.env' });
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.GMAIL_HOST,
		pass: process.env.GMAIL_PASS,
	},
});

function send(to, subject, text) {
	const mailOptions = {
		from: 'Portfoliouz.com',
		to: to,
		subject: subject,
		text: text,
	};

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.error(error);
		} else {
			console.info('Email sent: ' + info.response);
		}
	});
}

module.exports = send;

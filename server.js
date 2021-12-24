const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
	console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
	console.log(err.name, err.message);
	process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE || 'mongodb://localhost:27017/spotify';

mongoose
	.connect(DB, {
		// useNewUrlParser: true,
		// useCreateIndex: true,
		// useFindAndModify: false
	})
	.then(() => console.log('DB connection successful!'));

const port = parseInt(process.env.PORT) || 3000;
const host = process.env.HOST || 'localhost';
const server = app.listen(port, host, () => {
	console.log(`App running on port ${port} and host ${host}`);
});

process.on('unhandledRejection', (err) => {
	console.log('UNHANDLED REJECTION! 💥 Shutting down...');
	// @ts-ignore
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});

process.on('SIGTERM', () => {
	console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
	server.close(() => {
		console.log('💥 Process terminated!');
	});
});
